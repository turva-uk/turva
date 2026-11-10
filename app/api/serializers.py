"""Serializers for the JSON API.

**These convert between JSON and the domain. They do not implement the domain.**

That distinction is the whole reason the API is safe to have, and it is stated
at length in [ADR 0003](../../specifications/adr/0003-react-frontend-over-drf.md).
Concretely: a `ModelSerializer` over `SafetyFile` with a default `create()`
would write an index row without writing the repository, producing a safety
file that exists in the database and nowhere on disk. That is the exact
inversion of "Git is the system of record", and it would look like working
code.

So the write serializers here deliberately do *not* inherit from
`ModelSerializer`. They validate input and hand it to the service functions,
which own the ordering, the failure behaviour and the identifier rules.
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from app.accounts.models import Regulator, User
from app.safetyfiles.models import STANDARD_CHOICES, SafetyFile

# --------------------------------------------------------------------- users


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user, as the interface needs to render them.

    Read-only. Changing a profile goes through `ProfileUpdateSerializer`, which
    has rules this one would silently skip.
    """

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    professional_registration = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "organisation",
            "job_role",
            "professional_regulator",
            "registration_number",
            "professional_registration",
            "registration_verified",
            "is_cso",
            "cso_declared_at",
            "is_verified",
            "is_staff",
        )
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.Serializer):
    """Edit your own profile.

    Mirrors `app.accounts.forms.ProfileForm`, including its two rules about the
    CSO declaration, because those rules are about what a safety case may
    claim rather than about HTML forms.

    Email is absent deliberately: it is the account identifier that ties
    historic commits to a person, so changing it needs a re-confirmation flow
    rather than a writable field.

    `registration_verified` is absent for a stronger reason - it records that a
    human checked a registration against a regulator's public register, and a
    user must never be able to assert that about themselves. It is settable
    only through the admin. See TH-009 in SAFETY.md.
    """

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    organisation = serializers.CharField(max_length=100, allow_blank=True, required=False)
    job_role = serializers.CharField(max_length=100, allow_blank=True, required=False)
    professional_regulator = serializers.ChoiceField(
        choices=Regulator.choices, allow_blank=True, required=False
    )
    registration_number = serializers.CharField(max_length=40, allow_blank=True, required=False)
    is_cso = serializers.BooleanField(required=False, default=False)
    confirm_cso_criteria = serializers.BooleanField(required=False, default=False)

    def validate_registration_number(self, value: str) -> str:
        """Trim, but do not impose a format.

        Registration number formats differ by regulator and change over time -
        the GMC uses seven digits, the NMC a mixed alphanumeric form - so a
        strict pattern would reject valid registrations.
        """
        return value.strip()

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs.get("is_cso"):
            return attrs

        # core-specification.md: a CSO is "a registered healthcare
        # professional". Declaring the role without a registration is a
        # contradiction, and a safety case naming an unregistered CSO would not
        # withstand review.
        if not (attrs.get("professional_regulator") and attrs.get("registration_number")):
            raise serializers.ValidationError(
                {
                    "is_cso": (
                        "Record your professional regulator and registration number "
                        "before declaring that you act as a Clinical Safety Officer. "
                        "A CSO must be a registered healthcare professional."
                    )
                }
            )

        # The declaration is an attestation, not an idle checkbox: it is
        # recorded against every safety file the person creates.
        if not attrs.get("confirm_cso_criteria"):
            raise serializers.ValidationError(
                {
                    "confirm_cso_criteria": (
                        "Confirm that you meet the criteria before declaring the role."
                    )
                }
            )

        return attrs

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        was_cso = instance.is_cso
        declared = bool(validated_data.pop("is_cso", False))
        validated_data.pop("confirm_cso_criteria", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        # Through the model, so the declaration date is stamped on the
        # transition in and cleared on the way out. Setting `is_cso` directly
        # would leave a date against a role that is not held, or move a date
        # that records when an assertion was actually made.
        instance.declare_cso(declared=declared, was_declared=was_cso)
        instance.save()
        return instance


# -------------------------------------------------------------- authentication


class LoginSerializer(serializers.Serializer):
    """Credentials for a session login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if user is None:
            # One message for both "no such account" and "wrong password".
            # Distinguishing them tells an attacker which addresses are
            # registered.
            raise serializers.ValidationError(
                {"detail": "Email address or password is incorrect."}, code="authorization"
            )
        attrs["user"] = user
        return attrs


class RegistrationSerializer(serializers.Serializer):
    """Create an account.

    Mirrors `app.accounts.forms.RegistrationForm`. The password validators are
    Django's configured set, so the rules the API enforces are the rules the
    rest of the application enforces rather than a second opinion.
    """

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    organisation = serializers.CharField(max_length=100, allow_blank=True, required=False)
    job_role = serializers.CharField(max_length=100, allow_blank=True, required=False)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account already exists for that email address.")
        return value

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            organisation=validated_data.get("organisation", ""),
            job_role=validated_data.get("job_role", ""),
        )


# -------------------------------------------------------------- safety files


class SafetyFileSerializer(serializers.ModelSerializer):
    """A safety file as the index knows it.

    `ModelSerializer` is safe *here* because this one is read-only. The write
    path is `SafetyFileCreateSerializer`, which is not a ModelSerializer for
    the reason given at the top of this module.
    """

    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)
    standard_display = serializers.CharField(source="get_standard_display", read_only=True)
    url = serializers.CharField(source="get_absolute_url", read_only=True)
    exists_on_disk = serializers.BooleanField(read_only=True)

    class Meta:
        model = SafetyFile
        fields = (
            "id",
            "slug",
            "name",
            "standard",
            "standard_display",
            "organisation",
            "owner_name",
            "visibility",
            "url",
            "exists_on_disk",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class SafetyFileCreateSerializer(serializers.Serializer):
    """The four questions asked when creating a safety file.

    Deliberately not a `ModelSerializer`. Creating a safety file writes a Git
    repository first and an index row second, and leaves the repository intact
    if the index write fails. A generated `create()` would do neither.

    The view calls `create_safety_file()` with these values; this class does
    not save anything itself.
    """

    name = serializers.CharField(max_length=200)
    standard = serializers.ChoiceField(choices=STANDARD_CHOICES, default="DCB0160")
    organisation = serializers.CharField(max_length=200)
    intended_use = serializers.CharField()

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Give the system a name.")
        return name


# ------------------------------------------------- hazards, mitigations, history
#
# Read models from the repository rather than the database. They are plain
# serializers over the storage layer's dataclasses, not ModelSerializers, because
# there is no model: the hazard lives in a file.


class AssessmentSerializer(serializers.Serializer):
    severity = serializers.IntegerField(read_only=True)
    likelihood = serializers.IntegerField(read_only=True)
    # Derived from severity and likelihood by the storage layer. Read-only here
    # and everywhere: no code path may let a client set a risk level.
    risk_level = serializers.IntegerField(read_only=True)


class HazardSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    owner = serializers.CharField(read_only=True)
    created = serializers.DateField(read_only=True)
    updated = serializers.DateField(read_only=True)
    initial = AssessmentSerializer(read_only=True)
    residual = AssessmentSerializer(read_only=True)
    cause = serializers.CharField(read_only=True)
    effect = serializers.CharField(read_only=True)
    harm = serializers.CharField(read_only=True)
    justification = serializers.CharField(read_only=True)
    mitigations = serializers.ListField(child=serializers.CharField(), read_only=True)
    requires_elimination = serializers.BooleanField(read_only=True)


class MitigationSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    owner = serializers.CharField(read_only=True)
    created = serializers.DateField(read_only=True)
    updated = serializers.DateField(read_only=True)
    control_type = serializers.CharField(read_only=True)
    evidence = serializers.CharField(read_only=True)
    hazards = serializers.ListField(child=serializers.CharField(), read_only=True)


class CommitSerializer(serializers.Serializer):
    """One entry in the audit trail.

    This is the record a regulator or a court would examine, so the author is
    not optional and is never a service account.
    """

    short_sha = serializers.CharField(read_only=True)
    subject = serializers.CharField(read_only=True)
    author_name = serializers.CharField(read_only=True)
    author_email = serializers.EmailField(read_only=True)
    committed_at = serializers.DateTimeField(read_only=True)
