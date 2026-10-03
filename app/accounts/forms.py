"""Forms for registration and login."""

from __future__ import annotations

from django import forms
from django.contrib.auth.forms import AuthenticationForm, BaseUserCreationForm
from django.utils.translation import gettext_lazy as _

from app.accounts.models import User


class RegistrationForm(BaseUserCreationForm):
    """Create an account.

    `BaseUserCreationForm` rather than `UserCreationForm` because the latter
    assumes a `username` field, which this model does not have. It brings the
    password confirmation field and runs the configured password validators.
    """

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "organisation", "job_role")
        labels = {
            "organisation": _("Organisation"),
            "job_role": _("Job role"),
        }
        help_texts = {
            "organisation": _("Optional. The organisation you are doing this work for."),
            "job_role": _("Optional. For example: Clinical Safety Officer, developer."),
        }

    def clean_email(self) -> str:
        """Normalise and check uniqueness case-insensitively.

        `unique=True` on the field is case-sensitive in PostgreSQL, so without
        this two accounts could exist for `A@example.org` and `a@example.org` -
        which for email addresses are the same mailbox in practice, and would
        make "an account already exists" advice confusing.
        """
        email = User.objects.normalize_email(self.cleaned_data["email"])
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError(
                _("An account already exists for this email address."),
                code="duplicate_email",
            )
        return email


class LoginForm(AuthenticationForm):
    """Sign in with an email address.

    `AuthenticationForm` labels its field "Username" by default, which would be
    wrong here.
    """

    username = forms.EmailField(
        label=_("Email address"),
        widget=forms.EmailInput(attrs={"autofocus": True, "autocomplete": "email"}),
    )

    error_messages = {
        **AuthenticationForm.error_messages,
        # Deliberately does not distinguish "no such account" from "wrong
        # password": that difference tells an attacker which addresses are
        # registered.
        "invalid_login": _("Those details do not match an account. Please check and try again."),
    }
