"""User accounts and email verification.

Ported from the FastAPI implementation with the same semantics for email
verification: an eight-hour token lifetime, a ten-minute guard against
re-sending, and no verification without a matching unexpired token.

Django supplies password hashing, sessions, permissions and password reset, so
none of that appears here. What remains is the part that was genuinely
Turva-specific.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

#: How long an email verification token remains valid.
VERIFICATION_TOKEN_LIFETIME = timedelta(hours=8)

#: Minimum interval between issuing verification tokens for one user. Prevents a
#: resend endpoint from being used to send repeated mail to an address.
VERIFICATION_TOKEN_COOLDOWN = timedelta(minutes=10)


class VerificationError(Exception):
    """Raised when a verification token cannot be issued."""


class AlreadyVerified(VerificationError):
    """The user's email address is already verified."""


class TokenCooldownActive(VerificationError):
    """A token was issued too recently to issue another."""


class UserManager(BaseUserManager):
    """Manager for a user model keyed on email rather than a username."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra: object):
        if not email:
            raise ValueError("An email address is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra: object):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra: object):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        # A superuser creating their own account through the command line has
        # demonstrated control of it, so there is nothing for them to verify.
        extra.setdefault("is_verified", True)
        if extra.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True")
        if extra.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True")
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """A person who uses Turva.

    The primary key is a UUID rather than a sequence. Verification links contain
    the user's identifier, and a sequential one would disclose how many accounts
    exist and allow others to be guessed.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # `email` rather than the previous `email_address`. Django's password reset,
    # admin and `BaseUserManager` all address the field by this name, and
    # renaming it removes a whole class of "which name does this layer use"
    # confusion. The old API was already inconsistent, taking `email` on
    # registration and `email_address` on login.
    email = models.EmailField(_("email address"), unique=True, max_length=254)

    first_name = models.CharField(_("first name"), max_length=50)
    last_name = models.CharField(_("last name"), max_length=50)

    organisation = models.CharField(_("organisation"), max_length=100, blank=True)
    job_role = models.CharField(_("job role"), max_length=100, blank=True)

    is_cso = models.BooleanField(
        _("Clinical Safety Officer"),
        default=False,
        help_text=_(
            "Whether this person acts as a Clinical Safety Officer. A claim to "
            "be a CSO is not self-certifying: professional registration is "
            "recorded and checked separately."
        ),
    )

    is_active = models.BooleanField(_("active"), default=True)
    is_staff = models.BooleanField(_("staff status"), default=False)

    is_verified = models.BooleanField(
        _("email verified"),
        default=False,
        help_text=_("Whether this person has confirmed control of their email address."),
    )
    verification_token = models.CharField(max_length=100, blank=True, default="")
    verification_token_created_at = models.DateTimeField(null=True, blank=True)

    date_joined = models.DateTimeField(_("date joined"), default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name

    # ------------------------------------------------------ email verification

    def issue_verification_token(self) -> str:
        """Return a usable verification token, creating one if needed.

        Reuses the current token while it is valid, so a user who clicks an
        earlier email's link after requesting a resend is not told their link is
        broken.

        Raises:
            AlreadyVerified: the address is already confirmed.
            TokenCooldownActive: a token was issued within the cooldown.
        """
        if self.is_verified:
            raise AlreadyVerified("This email address is already verified.")

        issued_at = self.verification_token_created_at
        now = timezone.now()

        if issued_at is not None and now - issued_at < VERIFICATION_TOKEN_COOLDOWN:
            raise TokenCooldownActive(
                "A verification email was sent recently. Please wait before requesting another."
            )

        if not self.verification_token or issued_at is None or self.is_token_expired:
            self.verification_token = secrets.token_urlsafe(48)
            self.verification_token_created_at = now
            self.save(update_fields=["verification_token", "verification_token_created_at"])

        return self.verification_token

    @property
    def is_token_expired(self) -> bool:
        """Whether the current verification token is too old to use.

        A user with no token is treated as expired, so callers cannot accept an
        empty token by omission.
        """
        if self.verification_token_created_at is None:
            return True
        return timezone.now() - self.verification_token_created_at > VERIFICATION_TOKEN_LIFETIME

    def verify_email(self, token: str) -> bool:
        """Confirm the email address if `token` matches and has not expired.

        Returns True if this call verified the address, False if the token was
        wrong, empty or expired. Already-verified users return True, because the
        caller's goal - a verified address - is satisfied.
        """
        if self.is_verified:
            return True

        if not token or not self.verification_token or self.is_token_expired:
            return False

        # Constant-time comparison. The token is a bearer credential, and a
        # short-circuiting `==` leaks how much of a guess was correct.
        if not secrets.compare_digest(self.verification_token, token):
            return False

        self.is_verified = True
        self.verification_token = ""
        self.verification_token_created_at = None
        self.save(
            update_fields=["is_verified", "verification_token", "verification_token_created_at"]
        )
        return True
