"""Account views: registration, login, email verification.

Login, logout and password reset come from `django.contrib.auth.views` and are
wired up in `urls.py` with Turva's templates. Only registration and email
verification need code, which is the point of ADR 0001.
"""

from __future__ import annotations

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from app.accounts.emails import send_verification_email
from app.accounts.forms import RegistrationForm
from app.accounts.models import AlreadyVerified, TokenCooldownActive, User


def register(request: HttpRequest) -> HttpResponse:
    """Create an account and send the verification email."""
    if request.user.is_authenticated:
        return redirect("accounts:dashboard")

    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            _try_send_verification(request, user)
            # Sign the new account in immediately. The verification gate stops
            # them reaching anything that matters, and making them log in
            # straight after choosing a password is friction with no benefit.
            login(request, user)
            return redirect("accounts:verify_notice")
    else:
        form = RegistrationForm()

    return render(request, "accounts/register.html", {"form": form})


@require_http_methods(["GET"])
def verify(request: HttpRequest, user_id: str, token: str) -> HttpResponse:
    """Confirm an email address from a link in the verification email.

    GET, because it is reached by clicking a link in an email client. That makes
    the token visible in logs and browser history, which is why it is
    single-use: `verify_email` clears it on success.
    """
    user = get_object_or_404(User, pk=user_id)

    if user.is_verified:
        messages.info(request, "Your email address is already confirmed.")
        return redirect(_post_verification_target(request))

    if user.verify_email(token):
        messages.success(request, "Thank you - your email address is confirmed.")
        return redirect(_post_verification_target(request))

    return render(
        request,
        "accounts/verify_failed.html",
        {"verified_user": user},
        status=400,
    )


@login_required
def verify_notice(request: HttpRequest) -> HttpResponse:
    """Explain that a verification email has been sent."""
    if request.user.is_verified:
        return redirect("accounts:dashboard")
    return render(request, "accounts/verify_notice.html")


@login_required
@require_http_methods(["POST"])
def verify_resend(request: HttpRequest) -> HttpResponse:
    """Send another verification email to the signed-in user."""
    _try_send_verification(request, request.user)
    return redirect("accounts:verify_notice")


@login_required
def dashboard(request: HttpRequest) -> HttpResponse:
    """Placeholder landing page.

    Replaced by the safety file list once project creation exists. It is here so
    that `LOGIN_REDIRECT_URL` points somewhere real and the authentication flow
    can be tested end to end.
    """
    if not request.user.is_verified:
        return redirect("accounts:verify_notice")
    return render(request, "accounts/dashboard.html")


# ----------------------------------------------------------------- internals


def _try_send_verification(request: HttpRequest, user: User) -> None:
    """Issue a token and send the email, reporting problems to the user.

    A failure to send is reported but never raised: a working account whose
    confirmation email bounced is recoverable through resend, whereas a 500 on
    the registration form loses the submission.
    """
    try:
        token = user.issue_verification_token()
    except AlreadyVerified:
        messages.info(request, "Your email address is already confirmed.")
        return
    except TokenCooldownActive as exc:
        messages.warning(request, str(exc))
        return

    try:
        send_verification_email(user, token)
    except OSError:
        # Covers SMTP and socket failures, which all derive from OSError.
        messages.error(
            request,
            "We could not send the confirmation email just now. Please try again in a few minutes.",
        )
        return

    messages.success(request, f"We have sent a confirmation email to {user.email}.")


def _post_verification_target(request: HttpRequest) -> str:
    """Where to send someone after verifying.

    Signed-in users go to the dashboard; anyone following the link in a
    different browser is sent to log in.
    """
    if request.user.is_authenticated:
        return reverse("accounts:dashboard")
    return reverse("accounts:login")
