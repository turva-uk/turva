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
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.emails import send_verification_email
from app.accounts.forms import ProfileForm
from app.accounts.models import AlreadyVerified, Regulator, TokenCooldownActive
from app.api.permissions import IsVerified
from app.api.serializers import (
    CommitSerializer,
    HazardSerializer,
    LoginSerializer,
    MitigationSerializer,
    ProfileUpdateSerializer,
    RegistrationSerializer,
    SafetyFileCreateSerializer,
    SafetyFileSerializer,
    UserSerializer,
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
    """Issue a token and send the confirmation email. Never raises.

    The same rule the template flow follows, and for the same reason: a working
    account whose confirmation email bounced is recoverable through resend,
    whereas failing the request would lose a registration that already
    succeeded. The caller reports the outcome so the interface can offer
    resend rather than claim an email is on its way when it is not.
    """
    try:
        token = user.issue_verification_token()
    except AlreadyVerified, TokenCooldownActive:
        return False

    try:
        send_verification_email(user, token)
    except OSError:
        # Covers SMTP and socket failures, which all derive from OSError.
        logger.exception("Could not send the confirmation email to %s", user.pk)
        return False

    return True


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


class SafetyFileDetailView(APIView):
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
