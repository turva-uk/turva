"""Account operations shared by the JSON API and interim Django interface."""

from __future__ import annotations

from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import transaction
from django.utils.http import urlsafe_base64_decode

from app.accounts.emails import send_verification_email
from app.accounts.models import User


class InvalidAccountLink(Exception):
    """An unknown, invalid, spent or expired confirmation/recovery link."""


def confirm_email_address(user_id, token: str) -> None:
    with transaction.atomic():
        user = User.objects.select_for_update().filter(pk=user_id).first()
        if user is None or not user.verify_email(token):
            raise InvalidAccountLink


def reset_password(*, uid: str, token: str, new_password1: str, new_password2: str) -> dict:
    """Consume a Django reset token once, serialising competing attempts.

    Returns field errors without changing the password, or an empty mapping on
    success. Does not log in or preserve old sessions after a password change.
    """
    try:
        identifier = urlsafe_base64_decode(uid).decode()
    except ValueError, TypeError:
        raise InvalidAccountLink from None
    with transaction.atomic():
        try:
            user = User.objects.select_for_update().filter(pk=identifier, is_active=True).first()
        except ValidationError:
            raise InvalidAccountLink from None
        if user is None or not default_token_generator.check_token(user, token):
            raise InvalidAccountLink
        form = SetPasswordForm(
            user, {"new_password1": new_password1, "new_password2": new_password2}
        )
        if not form.is_valid():
            return dict(form.errors)
        form.save()
    return {}


def send_confirmation(user: User) -> None:
    """Serialise token issuance/resend attempts, then send outside the lock.

    The cooldown records an attempt even if SMTP fails, so repeated failures
    cannot turn this endpoint into an unbounded mail sender.
    """
    with transaction.atomic():
        current = User.objects.select_for_update().get(pk=user.pk)
        token = current.issue_verification_token()
    send_verification_email(current, token)


def request_password_reset(form: PasswordResetForm) -> None:
    """Use Django's reset mechanism and a configured origin, never a Host header."""
    origin = urlsplit(settings.SITE_BASE_URL)
    if origin.scheme not in {"http", "https"} or not origin.netloc:
        raise ImproperlyConfigured("SITE_BASE_URL must be an absolute HTTP(S) URL")
    form.save(
        domain_override=origin.netloc,
        use_https=origin.scheme == "https",
        from_email=settings.DEFAULT_FROM_EMAIL,
        email_template_name="accounts/email/password_reset.txt",
        html_email_template_name="accounts/email/password_reset.html",
        subject_template_name="accounts/email/password_reset_subject.txt",
    )
