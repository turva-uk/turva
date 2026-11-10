"""API views.

**Every write goes through a service function.** Nothing here calls
`SafetyFile.objects.create()` or sets `is_cso` directly, because the rules that
make those operations safe live below this layer and a view that reimplemented
them would eventually disagree with the one that did not. See
[ADR 0003](../../specifications/adr/0003-react-frontend-over-drf.md).
"""

from __future__ import annotations

import logging

from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth.forms import PasswordResetForm
from django.http import Http404
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.forms import ProfileForm
from app.accounts.models import AlreadyVerified, Regulator, TokenCooldownActive
from app.accounts.services import (
    InvalidAccountLink,
    confirm_email_address,
    request_password_reset,
    reset_password,
    send_confirmation,
)
from app.api.permissions import IsVerified
from app.api.serializers import (
    CommitSerializer,
    HazardSerializer,
    LoginSerializer,
    MitigationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegistrationSerializer,
    SafetyFileCreateSerializer,
    SafetyFileSerializer,
    UserSerializer,
    VerificationSerializer,
)
from app.safetyfiles.services import SafetyFileDetails, create_safety_file, visible_to
from safety_file.errors import SafetyFileError

logger = logging.getLogger(__name__)


# -------------------------------------------------------------- authentication


class SessionView(APIView):
    """The current session: who you are, or that you are nobody.

    The single-page application calls this on boot to decide whether to show
    the interface or the login screen, so it must answer for an anonymous
    caller rather than 401 - "you are not signed in" is the useful answer, not
    an error.

    It also sets the CSRF cookie as a side effect of `get_token`, which is what
    lets the client make its first unsafe request. Without this the login POST
    would have no token to send, and the chicken-and-egg would show up as an
    unexplained 403 on the very first interaction.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        get_token(request)

        if not request.user.is_authenticated:
            return Response({"authenticated": False, "user": None})

        return Response({"authenticated": True, "user": UserSerializer(request.user).data})


#: CSRF protection for endpoints that accept unauthenticated POSTs.
#:
#: DRF leaves a hole here that is easy to miss, because the obvious test passes.
#: `APIView.as_view()` sets `csrf_exempt = True`, so Django's
#: `CsrfViewMiddleware` never runs; DRF re-enforces CSRF inside
#: `SessionAuthentication` instead. But that authenticator returns early for an
#: anonymous request - there is no session user to authenticate - so
#: `enforce_csrf` is never reached. Authenticated writes are protected;
#: login, registration and logout are not.
#:
#: Unprotected, login is open to login CSRF: an attacker makes a victim's
#: browser sign in as *the attacker*, and the victim then works inside an
#: account the attacker controls. In Turva that means hazard assessments and
#: profile details entered into someone else's safety file, with the audit
#: trail faithfully recording the attacker as the author. That reaches both
#: TH-004, the audit trail not being trustworthy, and TH-005, unauthorised
#: access to a safety file.
#:
#: Verified by probing a running server, not by reading the code: the login
#: POST succeeded with no token until this was applied.
csrf_protected = method_decorator(csrf_protect, name="dispatch")


@csrf_protected
class LoginView(APIView):
    """Sign in, establishing a session.

    `django_login` cycles the session key, which is what stops a session fixed
    before authentication from being reused afterwards.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        django_login(request, user)

        return Response({"authenticated": True, "user": UserSerializer(user).data})


@csrf_protected
class LogoutView(APIView):
    """Sign out, flushing the session.

    `AllowAny` because signing out an already-signed-out caller should succeed
    quietly rather than fail: the client's intent is "ensure I am signed out",
    and a 403 there is a worse outcome than a no-op.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        django_logout(request)
        return Response({"authenticated": False, "user": None})


@csrf_protected
class RegistrationView(APIView):
    """Create an account and sign the new user in.

    Signing them in immediately matches the template flow, where registration
    leads straight to the verification notice rather than back to a login form.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        email_sent = _send_confirmation(user)
        django_login(request, user)

        return Response(
            {
                "authenticated": True,
                "user": UserSerializer(user).data,
                "confirmation_email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED,
        )


def _send_confirmation(user) -> bool:
    """Report expected token/delivery failures without losing the new account.

    The same rule the template flow follows, and for the same reason: a working
    account whose confirmation email bounced is recoverable through resend,
    whereas failing the request would lose a registration that already
    succeeded. The caller reports the outcome so the interface can offer
    resend rather than claim an email is on its way when it is not.
    """
    try:
        send_confirmation(user)
    except AlreadyVerified, TokenCooldownActive:
        return False

    except OSError:
        # Covers SMTP and socket failures, which all derive from OSError.
        logger.exception("Could not send the confirmation email to %s", user.pk)
        return False

    return True


@csrf_protected
class VerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = VerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_email_address(**serializer.validated_data)
        except InvalidAccountLink:
            return Response(
                {
                    "detail": "This confirmation link is invalid or has expired. Sign in to request another."
                },
                status=400,
            )
        return Response(
            {"detail": "Email address confirmed. You can now sign in and open your safety files."}
        )


@csrf_protected
class VerificationResendView(APIView):
    def post(self, request: Request) -> Response:
        try:
            send_confirmation(request.user)
        except AlreadyVerified:
            return Response({"detail": "Your email address is already confirmed."})
        except TokenCooldownActive:
            return Response(
                {
                    "detail": "A confirmation email was requested recently. Wait ten minutes before requesting another."
                },
                status=429,
            )
        except OSError:
            logger.exception("Could not resend confirmation email for %s", request.user.pk)
            return Response(
                {
                    "detail": "The confirmation email could not be sent. Please try again in ten minutes."
                },
                status=503,
            )
        return Response(
            {
                "detail": "Confirmation email sent. The link is valid for up to eight hours from its original issue."
            }
        )


@csrf_protected
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        form = PasswordResetForm(serializer.validated_data)
        if not form.is_valid():
            return Response(dict(form.errors), status=400)
        try:
            request_password_reset(form)
        except OSError:
            # Same response for known/unknown accounts, including send failure.
            # Never disclose whether an address is registered through an error.
            logger.exception("Password reset email delivery failed")
        return Response(
            {
                "detail": "If an active account exists for that address, a password reset email will be sent. If it does not arrive, check your junk folder or contact an administrator."
            },
            status=202,
        )


@csrf_protected
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            errors = reset_password(**serializer.validated_data)
        except InvalidAccountLink:
            return self.invalid_link()
        if errors:
            return Response(errors, status=400)
        # Do not log in automatically or preserve an old session after reset.
        return Response({"detail": "Password changed. Sign in with your new password."})

    @staticmethod
    def invalid_link() -> Response:
        return Response(
            {"detail": "This password reset link is invalid or has expired. Request a new one."},
            status=400,
        )


# ------------------------------------------------------------------- profile


class ProfileView(APIView):
    """Read and update your own profile.

    Authenticated but not `IsVerified`: someone who has not yet confirmed their
    email still needs to correct the name that will be attributed to their
    commits, and blocking them here would be a dead end rather than a
    safeguard.
    """

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)

    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


class ProfileOptionsView(APIView):
    """The same regulator choices and declaration wording as the Django form."""

    def get(self, request: Request) -> Response:
        return Response(
            {
                "regulators": [
                    {"value": value, "label": str(label)} for value, label in Regulator.choices
                ],
                "cso_criteria": str(ProfileForm.base_fields["confirm_cso_criteria"].help_text),
            }
        )


# -------------------------------------------------------------- safety files


class SafetyFileListView(APIView):
    """List the safety files you may see, and create new ones."""

    permission_classes = [IsVerified]

    def get(self, request: Request) -> Response:
        safety_files = visible_to(request.user).select_related("owner")
        return Response(SafetyFileSerializer(safety_files, many=True).data)

    def post(self, request: Request) -> Response:
        serializer = SafetyFileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        details = SafetyFileDetails(**serializer.validated_data)

        try:
            # The service, not the model. It writes the repository before the
            # index row and leaves the repository intact if the index write
            # fails, and both of those are the difference between a safety file
            # existing and a row claiming one does.
            safety_file = create_safety_file(details, request.user)
        except SafetyFileError, OSError:
            # Covers a template that will not render, an unwritable storage
            # root, and a git failure. Logged with a traceback; the client gets
            # something it can show rather than an opaque 500.
            logger.exception("Could not create safety file %r", details.name)
            return Response(
                {
                    "detail": (
                        "Turva could not create the safety file. Nothing was saved. "
                        "This has been logged - please try again, and tell an "
                        "administrator if it keeps happening."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(SafetyFileSerializer(safety_file).data, status=status.HTTP_201_CREATED)


class RepositoryReadView(APIView):
    """A broken repository is unavailable evidence, never an empty log. TH-001."""

    permission_classes = [IsVerified]

    def handle_exception(self, exc):
        if isinstance(exc, (SafetyFileError, OSError)):
            logger.exception("Could not read safety evidence")
            return Response(
                {
                    "detail": "Turva could not read the safety evidence. No empty or partial "
                    "record is being shown. Please ask an administrator to check the repository."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return super().handle_exception(exc)


class SafetyFileDetailView(RepositoryReadView):
    """One safety file, read from its repository rather than from the index.

    The hazards, mitigations and history come from Git, not from the database.
    That is deliberate and worth the extra filesystem work: the response cannot
    carry a stale or invented figure, and if the index and the repository ever
    disagree, this tells the truth.
    """

    permission_classes = [IsVerified]

    def get(self, request: Request, slug: str) -> Response:
        # 404 rather than 403 for a file you may not see: a 403 confirms that
        # it exists.
        safety_file = get_object_or_404(visible_to(request.user), slug=slug)

        payload = {"safety_file": SafetyFileSerializer(safety_file).data}

        if not safety_file.exists_on_disk:
            # The index knows about a repository that is not there. Surfaced
            # rather than 500-ing, because the likely causes - a restore that
            # missed the volume, a half-failed creation - need a person, and
            # the message should say which.
            payload |= {
                "repository_missing": True,
                "repository_path": str(safety_file.repository_path),
            }
            return Response(payload)

        repository = safety_file.repository()
        hazards = repository.hazards()

        payload |= {
            "repository_missing": False,
            "hazards": HazardSerializer(hazards, many=True).data,
            "mitigations": MitigationSerializer(repository.mitigations(), many=True).data,
            "blocking": [
                hazard.id
                for hazard in hazards
                if hazard.status == "open" and hazard.requires_elimination
            ],
            "history": CommitSerializer(repository.history(limit=10), many=True).data,
            "problems": repository.validate(),
            "head_sha": repository.head_sha,
        }
        return Response(payload)


class HazardDetailView(RepositoryReadView):
    """Read one hazard, its linked evidence and its own attributable history."""

    def get(self, request: Request, slug: str, hazard_id: str) -> Response:
        safety_file = get_object_or_404(visible_to(request.user), slug=slug)
        repository = safety_file.repository()
        hazard = next((h for h in repository.hazards() if h.id == hazard_id), None)
        if hazard is None:
            raise Http404
        linked = [m for m in repository.mitigations() if m.id in hazard.mitigations]
        return Response(
            {
                "safety_file": SafetyFileSerializer(safety_file).data,
                "hazard": HazardSerializer(hazard).data,
                "mitigations": MitigationSerializer(linked, many=True).data,
                "history": CommitSerializer(repository.hazard_history(hazard_id), many=True).data,
                "problems": repository.validate(),
                "head_sha": repository.head_sha,
            }
        )
