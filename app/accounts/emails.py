"""Outgoing account email.

Uses Django's mail backend, so the test suite captures messages in
`django.core.mail.outbox` rather than needing an SMTP server, and development can
print to the console by setting `EMAIL_BACKEND`.
"""

from __future__ import annotations

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.urls import reverse

from app.accounts.models import User


def verification_url(user: User, token: str) -> str:
    """The absolute link a user follows to confirm their email address.

    Built from `SITE_BASE_URL` rather than from a request, because mail is also
    sent from management commands and background work where no request exists.
    """
    path = reverse("accounts:verify", kwargs={"user_id": user.pk, "token": token})
    return f"{settings.SITE_BASE_URL.rstrip('/')}{path}"


def send_verification_email(user: User, token: str) -> None:
    """Send the email confirmation message.

    The caller issues the token, so that a cooldown or already-verified error
    surfaces as a user-visible message rather than a failed send.
    """
    context = {
        "user": user,
        "verification_url": verification_url(user, token),
    }
    subject = "Confirm your email address for Turva"
    text_body = render_to_string("accounts/email/verify.txt", context)
    html_body = render_to_string("accounts/email/verify.html", context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send()
