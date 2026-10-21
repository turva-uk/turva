"""Forms for registration and login."""

from __future__ import annotations

from django import forms
from django.contrib.auth.forms import AuthenticationForm, BaseUserCreationForm
from django.utils.translation import gettext_lazy as _

from app.accounts.models import User

#: Autofill tokens from the HTML specification, so browsers and password
#: managers can fill and store these fields correctly. Also WCAG 2.2 SC 1.3.5,
#: Identify Input Purpose.
#:
#: `username` rather than `email` for the address: it is the account identifier,
#: and it is the token password managers use to associate a saved credential.
#: The login form uses the same token so that a credential saved at registration
#: is offered at sign-in. Django already applies `new-password` and
#: `current-password` to the password fields itself.
AUTOCOMPLETE_EMAIL = "username"


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
        widgets = {
            "email": forms.EmailInput(
                attrs={"autocomplete": AUTOCOMPLETE_EMAIL, "autofocus": True}
            ),
            "first_name": forms.TextInput(attrs={"autocomplete": "given-name"}),
            "last_name": forms.TextInput(attrs={"autocomplete": "family-name"}),
            "organisation": forms.TextInput(attrs={"autocomplete": "organization"}),
            "job_role": forms.TextInput(attrs={"autocomplete": "organization-title"}),
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
        widget=forms.EmailInput(attrs={"autofocus": True, "autocomplete": AUTOCOMPLETE_EMAIL}),
    )

    error_messages = {
        **AuthenticationForm.error_messages,
        # Deliberately does not distinguish "no such account" from "wrong
        # password": that difference tells an attacker which addresses are
        # registered.
        "invalid_login": _("Those details do not match an account. Please check and try again."),
    }


class ProfileForm(forms.ModelForm):
    """Edit your own details, professional registration and CSO declaration.

    Email address is deliberately absent. Changing it would move the account's
    identity and invalidate the confirmation that makes attribution meaningful,
    so it needs a re-confirmation flow rather than a text input on this form.
    """

    confirm_cso_criteria = forms.BooleanField(
        required=False,
        label=_("I meet the criteria for a Clinical Safety Officer"),
        help_text=_(
            "I hold current professional registration, I have been trained in "
            "clinical risk management, I am organisationally independent of "
            "development and delivery pressures, and I have the authority to "
            "influence or halt a deployment."
        ),
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "organisation",
            "job_role",
            "professional_regulator",
            "registration_number",
            "is_cso",
        )
        labels = {"is_cso": _("I act as a Clinical Safety Officer")}
        help_texts = {
            "organisation": _("The organisation you do this work for."),
            "job_role": _("For example: Clinical Safety Officer, developer, analyst."),
            "registration_number": _("As it appears on your regulator's public register."),
            "is_cso": _(
                "Your name and registration appear in safety files you create. "
                "Turva records this declaration; it does not confer the role."
            ),
        }
        widgets = {
            "first_name": forms.TextInput(attrs={"autocomplete": "given-name"}),
            "last_name": forms.TextInput(attrs={"autocomplete": "family-name"}),
            "organisation": forms.TextInput(attrs={"autocomplete": "organization"}),
            "job_role": forms.TextInput(attrs={"autocomplete": "organization-title"}),
            "registration_number": forms.TextInput(attrs={"autocomplete": "off"}),
        }

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)

        # Captured here, before validation runs. `is_valid()` applies the
        # submitted data to `self.instance`, so by the time `save()` is reached
        # `instance.is_cso` already reflects the submission and cannot be
        # compared against. Reading it in the view has the same problem, because
        # the view passes `request.user` *as* the instance - they are one object.
        self._was_cso = bool(self.instance.pk) and self.instance.is_cso

        # Someone who has already declared should not have to re-tick the
        # attestation every time they correct a typo in their job title.
        if self._was_cso:
            self.fields["confirm_cso_criteria"].initial = True

        for name in ("first_name", "last_name"):
            self.fields[name].required = True

    @property
    def cso_newly_declared(self) -> bool:
        """Whether this submission declared the role for the first time.

        Exposed so the view does not have to infer it from an instance the form
        has already modified.
        """
        return bool(self.cleaned_data.get("is_cso")) and not self._was_cso

    def clean(self) -> dict:
        cleaned = super().clean()
        is_cso = cleaned.get("is_cso")

        if not is_cso:
            return cleaned

        # core-specification.md: a CSO is "a registered healthcare professional"
        # and "must have current professional registration". Declaring the role
        # without one is a contradiction, and a safety file naming an
        # unregistered CSO would not withstand review.
        if not (cleaned.get("professional_regulator") and cleaned.get("registration_number")):
            self.add_error(
                "is_cso",
                _(
                    "Record your professional regulator and registration number "
                    "before declaring that you act as a Clinical Safety Officer. "
                    "A CSO must be a registered healthcare professional."
                ),
            )

        if not cleaned.get("confirm_cso_criteria"):
            self.add_error(
                "confirm_cso_criteria",
                _(
                    "Confirm that you meet the criteria before declaring the "
                    "role. The declaration is recorded against safety files you "
                    "create."
                ),
            )

        return cleaned

    def clean_registration_number(self) -> str:
        """Trim and sanity-check, but do not impose a format.

        Registration number formats differ by regulator and change over time -
        the GMC uses seven digits, the NMC a mixed alphanumeric form - so a
        strict pattern would reject valid registrations. The check is only that
        it is plausibly a reference rather than prose.
        """
        number = self.cleaned_data.get("registration_number", "").strip()
        if number and len(number) > 40:
            raise forms.ValidationError(_("That is too long for a registration number."))
        return number

    def save(self, commit: bool = True) -> User:
        user = super().save(commit=False)
        declared = bool(self.cleaned_data.get("is_cso"))

        # `super().save()` has already set `is_cso` on the instance, so
        # `declare_cso` cannot detect the transition itself. Pass the previous
        # state explicitly rather than having it guess.
        user.declare_cso(declared=declared, was_declared=self._was_cso)

        if commit:
            user.save()
        return user
