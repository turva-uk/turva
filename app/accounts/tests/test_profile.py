"""Tests for profile management, professional registration and CSO designation.

The CSO tests get more attention than a profile form would normally warrant,
because this is the one place where a user's own assertion flows into a
regulatory document. See TH-009 in SAFETY.md.
"""

from __future__ import annotations

import re

import pytest
from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone

from app.accounts.models import Regulator, User

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"

BASE = {
    "first_name": "Anita",
    "last_name": "Patel",
    "organisation": "Riverbank Health Federation",
    "job_role": "Clinical Safety Officer",
    "professional_regulator": "",
    "registration_number": "",
}

REGISTERED = {**BASE, "professional_regulator": Regulator.GMC, "registration_number": "7654321"}

AS_CSO = {**REGISTERED, "is_cso": "on", "confirm_cso_criteria": "on"}


def prose(response: HttpResponse) -> str:
    """Rendered text with whitespace collapsed, so wrapped prose still matches."""
    return re.sub(r"\s+", " ", response.content.decode())


@pytest.fixture
def user(db) -> User:
    person = User.objects.create_user(
        email="a.patel@riverbank.example.nhs.uk",
        password=PASSWORD,
        first_name="Anita",
        last_name="Patel",
    )
    person.is_verified = True
    person.save(update_fields=["is_verified"])
    return person


class TestAccess:
    def test_requires_sign_in(self, client):
        response = client.get(reverse("accounts:profile"))
        assert response.status_code == 302
        assert reverse("accounts:login") in response["Location"]

    def test_an_unverified_user_may_still_edit_their_profile(self, client, db):
        """Not `verified_required`.

        Someone who has not confirmed their email still needs to fix the name
        that will be attributed to their commits. Blocking them would be a dead
        end, not a safeguard.
        """
        unverified = User.objects.create_user(
            email="s.whitlock@riverbank.example.nhs.uk",
            password=PASSWORD,
            first_name="Sarah",
            last_name="Whitlock",
        )
        client.force_login(unverified)
        assert client.get(reverse("accounts:profile")).status_code == 200

    def test_the_profile_is_reachable_from_the_header(self, client, user):
        """A profile nobody can find is a profile nobody updates."""
        client.force_login(user)
        body = client.get(reverse("safetyfiles:list")).content.decode()
        assert reverse("accounts:profile") in body


class TestEditingDetails:
    def test_updates_name_and_organisation(self, client, user):
        client.force_login(user)
        client.post(reverse("accounts:profile"), {**BASE, "first_name": "Anita J"})

        user.refresh_from_db()
        assert user.first_name == "Anita J"
        assert user.organisation == "Riverbank Health Federation"

    def test_a_name_is_required(self, client, user):
        """It is what appears as the author of every commit."""
        client.force_login(user)
        response = client.post(reverse("accounts:profile"), {**BASE, "first_name": ""})
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Anita"

    def test_the_email_address_cannot_be_changed_here(self, client, user):
        """Changing it would move the account's identity and invalidate the
        confirmation that makes attribution meaningful."""
        client.force_login(user)
        response = client.get(reverse("accounts:profile"))
        assert "email" not in response.context["form"].fields

        client.post(reverse("accounts:profile"), {**BASE, "email": "someone@else.example.nhs.uk"})
        user.refresh_from_db()
        assert user.email == "a.patel@riverbank.example.nhs.uk"


class TestProfessionalRegistration:
    def test_records_a_registration(self, client, user):
        client.force_login(user)
        client.post(reverse("accounts:profile"), REGISTERED)

        user.refresh_from_db()
        assert user.professional_regulator == Regulator.GMC
        assert user.registration_number == "7654321"
        assert user.professional_registration == "GMC 7654321"

    def test_a_registration_is_never_verified_by_default(self, client, user):
        """Turva has no connection to any register."""
        client.force_login(user)
        client.post(reverse("accounts:profile"), REGISTERED)
        user.refresh_from_db()
        assert user.registration_verified is False

    def test_verification_status_cannot_be_set_through_the_form(self, client, user):
        """Otherwise a user could mark their own registration as checked."""
        client.force_login(user)
        client.post(reverse("accounts:profile"), {**REGISTERED, "registration_verified": "on"})
        user.refresh_from_db()
        assert user.registration_verified is False

    def test_the_interface_marks_an_unverified_registration(self, client, user):
        client.force_login(user)
        client.post(reverse("accounts:profile"), REGISTERED)
        body = prose(client.get(reverse("accounts:profile")))
        assert "Not verified by Turva" in body
        assert "confirm a registration against the public register" in body

    def test_whitespace_is_trimmed(self, client, user):
        client.force_login(user)
        client.post(
            reverse("accounts:profile"), {**REGISTERED, "registration_number": "  7654321 "}
        )
        user.refresh_from_db()
        assert user.registration_number == "7654321"

    def test_no_registration_means_no_formatted_string(self, user):
        assert user.has_professional_registration is False
        assert user.professional_registration == ""

    def test_a_regulator_without_a_number_is_not_a_registration(self, user):
        user.professional_regulator = Regulator.GMC
        user.registration_number = "   "
        assert user.has_professional_registration is False


class TestCSODesignation:
    def test_declaring_the_role_records_it_with_a_date(self, client, user):
        client.force_login(user)
        client.post(reverse("accounts:profile"), AS_CSO)

        user.refresh_from_db()
        assert user.is_cso is True
        assert user.cso_declared_at is not None

    def test_cannot_declare_without_a_professional_registration(self, client, user):
        """core-specification.md: a CSO is a registered healthcare professional."""
        client.force_login(user)
        response = client.post(
            reverse("accounts:profile"), {**BASE, "is_cso": "on", "confirm_cso_criteria": "on"}
        )

        assert response.status_code == 200
        assert "must be a registered healthcare professional" in prose(response)
        user.refresh_from_db()
        assert user.is_cso is False

    def test_cannot_declare_without_confirming_the_criteria(self, client, user):
        """The declaration should be an attestation, not an idle checkbox."""
        client.force_login(user)
        response = client.post(reverse("accounts:profile"), {**REGISTERED, "is_cso": "on"})

        assert response.status_code == 200
        assert "Confirm that you meet the criteria" in prose(response)
        user.refresh_from_db()
        assert user.is_cso is False

    def test_the_criteria_are_stated_not_merely_referenced(self, client, user):
        """A person cannot attest to criteria they have not been shown."""
        client.force_login(user)
        body = prose(client.get(reverse("accounts:profile")))
        for criterion in (
            "current professional registration",
            "trained in clinical risk management",
            "organisationally independent",
            "authority to influence or halt",
        ):
            assert criterion in body, f"the form does not state: {criterion}"

    @pytest.mark.parametrize("field", ["is_cso", "confirm_cso_criteria"])
    def test_the_checkbox_still_points_at_its_own_description(self, client, user, field):
        """The checkboxes are rendered by hand, so Django no longer guarantees this.

        `BoundField` writes `aria-describedby="<auto_id>_helptext"` onto the
        widget whichever way the field is rendered. The partial that puts the
        box beside its statement has to carry that id, or a screen reader
        announces a bare "I act as a Clinical Safety Officer" with none of the
        qualification that follows it - on the one declaration where the
        qualification is the point.
        """
        client.force_login(user)
        body = client.get(reverse("accounts:profile")).content.decode()
        assert f'aria-describedby="id_{field}_helptext"' in body
        assert f'id="id_{field}_helptext"' in body

    def test_the_user_is_told_the_declaration_is_not_verified(self, client, user):
        client.force_login(user)
        response = client.post(reverse("accounts:profile"), AS_CSO, follow=True)
        assert "has not verified your registration" in prose(response)

    def test_withdrawing_the_role_clears_the_declaration_date(self, client, user):
        """The record must not show a date for a role that is not held."""
        client.force_login(user)
        client.post(reverse("accounts:profile"), AS_CSO)
        client.post(reverse("accounts:profile"), REGISTERED)

        user.refresh_from_db()
        assert user.is_cso is False
        assert user.cso_declared_at is None

    def test_redeclaring_does_not_move_the_original_date(self, client, user):
        """Saving an unrelated edit should not look like a fresh declaration."""
        client.force_login(user)
        client.post(reverse("accounts:profile"), AS_CSO)
        user.refresh_from_db()
        first = user.cso_declared_at

        client.post(reverse("accounts:profile"), {**AS_CSO, "job_role": "Lead CSO"})
        user.refresh_from_db()
        assert user.cso_declared_at == first

    def test_an_existing_cso_is_not_asked_to_re_attest_to_edit_a_typo(self, client, user):
        client.force_login(user)
        client.post(reverse("accounts:profile"), AS_CSO)

        form = client.get(reverse("accounts:profile")).context["form"]
        assert form.fields["confirm_cso_criteria"].initial is True

    def test_declare_cso_is_idempotent_on_the_model(self, user):
        user.declare_cso(declared=True)
        first = user.cso_declared_at
        assert first is not None
        user.declare_cso(declared=True)
        assert user.cso_declared_at == first

    def test_declare_cso_clears_the_date_on_withdrawal(self, user):
        user.declare_cso(declared=True)
        user.declare_cso(declared=False)
        assert user.is_cso is False
        assert user.cso_declared_at is None


class TestRegistrationReachesTheSafetyFile:
    """The point of recording a registration: it appears in the document."""

    def _safety_file_for(self, owner):
        from app.safetyfiles.services import SafetyFileDetails, create_safety_file

        return create_safety_file(
            SafetyFileDetails(
                name="BP@Home remote blood pressure monitoring",
                standard="DCB0160",
                organisation="Riverbank Health Federation",
                intended_use="Remote blood pressure monitoring.",
            ),
            owner,
        )

    def test_the_registration_appears_in_the_risk_management_plan(self, user):
        user.professional_regulator = Regulator.GMC
        user.registration_number = "7654321"
        user.save(update_fields=["professional_regulator", "registration_number"])

        repository = self._safety_file_for(user).repository()
        plan = (repository.root / "docs" / "clinical-risk-management-plan.md").read_text()
        assert "GMC 7654321" in plan

    def test_the_document_says_the_registration_was_not_verified(self, user):
        """TH-009. The number carries weight; the document must not imply a check."""
        user.professional_regulator = Regulator.GMC
        user.registration_number = "7654321"
        user.save(update_fields=["professional_regulator", "registration_number"])

        repository = self._safety_file_for(user).repository()
        plan = (repository.root / "docs" / "clinical-risk-management-plan.md").read_text()
        normalised = re.sub(r"\s+", " ", plan)
        assert "have not been verified against the regulator's public register" in normalised

    def test_without_a_registration_the_field_is_visibly_outstanding(self, user):
        from app.safetyfiles.services import TO_BE_COMPLETED

        repository = self._safety_file_for(user).repository()
        plan = (repository.root / "docs" / "clinical-risk-management-plan.md").read_text()
        assert TO_BE_COMPLETED in plan


class TestAdminSupport:
    def test_staff_can_record_that_a_registration_was_checked(
        self, client, django_user_model, user
    ):
        """The only route to `registration_verified`, since Turva cannot check
        automatically and a user must not set it for themselves."""
        admin = django_user_model.objects.create_superuser(
            email="admin@riverbank.example.nhs.uk",
            password=PASSWORD,
            first_name="Ad",
            last_name="Min",
        )
        user.professional_regulator = Regulator.GMC
        user.registration_number = "7654321"
        user.registration_verified = True
        user.save()

        client.force_login(admin)
        response = client.get(f"/admin/accounts/user/{user.pk}/change/")
        assert response.status_code == 200
        assert "registration_verified" in response.content.decode()


class TestDeclarationTimestamp:
    def test_the_date_is_recorded_in_the_user_timezone_aware(self, user):
        before = timezone.now()
        user.declare_cso(declared=True)
        assert before <= user.cso_declared_at <= timezone.now()
        assert timezone.is_aware(user.cso_declared_at)
