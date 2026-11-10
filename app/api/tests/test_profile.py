"""Tests for the profile endpoint.

The CSO declaration rules get disproportionate attention, as they do in the
template layer's tests, because this is the one place a user's own assertion
flows into a regulatory document. See TH-009 in SAFETY.md.
"""

from __future__ import annotations

import pytest
from django.urls import reverse

from app.accounts.models import Regulator, User

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"

BASE = {
    "first_name": "Anita",
    "last_name": "Patel",
    "organisation": "Riverbank Health Federation",
    "job_role": "Clinical Safety Officer",
}
REGISTERED = {**BASE, "professional_regulator": Regulator.GMC, "registration_number": "7654321"}
AS_CSO = {**REGISTERED, "is_cso": True, "confirm_cso_criteria": True}


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


def patch(client, payload):
    return client.patch(reverse("v1:profile"), payload, content_type="application/json")


class TestAccess:
    def test_requires_sign_in(self, client):
        assert client.get(reverse("v1:profile")).status_code == 403

    def test_an_unverified_user_may_still_edit_their_profile(self, client, db):
        """Not `IsVerified`: someone who has not confirmed their email still
        needs to fix the name that will be attributed to their commits."""
        unverified = User.objects.create_user(
            email="s.whitlock@riverbank.example.nhs.uk",
            password=PASSWORD,
            first_name="Sarah",
            last_name="Whitlock",
        )
        client.force_login(unverified)
        assert client.get(reverse("v1:profile")).status_code == 200


class TestEditing:
    def test_updates_name_and_organisation(self, client, user):
        client.force_login(user)
        assert patch(client, {**BASE, "first_name": "Anita J"}).status_code == 200

        user.refresh_from_db()
        assert user.first_name == "Anita J"
        assert user.organisation == "Riverbank Health Federation"

    def test_the_email_address_cannot_be_changed_here(self, client, user):
        """It is the account identifier that ties historic commits to a person."""
        client.force_login(user)
        patch(client, {**BASE, "email": "someone@else.example.nhs.uk"})
        user.refresh_from_db()
        assert user.email == "a.patel@riverbank.example.nhs.uk"


class TestProfessionalRegistration:
    def test_records_a_registration(self, client, user):
        client.force_login(user)
        body = patch(client, REGISTERED).json()
        assert body["professional_registration"] == "GMC 7654321"

    def test_it_is_never_verified_by_default(self, client, user):
        """Turva has no connection to any regulator's register."""
        client.force_login(user)
        assert patch(client, REGISTERED).json()["registration_verified"] is False

    def test_verification_status_cannot_be_set_through_the_api(self, client, user):
        """Otherwise a user could assert that someone had checked their own
        registration. The admin is the only route. See TH-009."""
        client.force_login(user)
        patch(client, {**REGISTERED, "registration_verified": True})
        user.refresh_from_db()
        assert user.registration_verified is False

    def test_whitespace_is_trimmed(self, client, user):
        client.force_login(user)
        patch(client, {**REGISTERED, "registration_number": "  7654321 "})
        user.refresh_from_db()
        assert user.registration_number == "7654321"


class TestCSODeclaration:
    def test_declaring_records_it_with_a_date(self, client, user):
        client.force_login(user)
        assert patch(client, AS_CSO).status_code == 200

        user.refresh_from_db()
        assert user.is_cso is True
        assert user.cso_declared_at is not None

    def test_cannot_declare_without_a_professional_registration(self, client, user):
        """core-specification.md: a CSO is a registered healthcare professional."""
        client.force_login(user)
        response = patch(client, {**BASE, "is_cso": True, "confirm_cso_criteria": True})

        assert response.status_code == 400
        assert "registered healthcare professional" in str(response.json())
        user.refresh_from_db()
        assert user.is_cso is False

    def test_cannot_declare_without_confirming_the_criteria(self, client, user):
        """The declaration is an attestation, not an idle checkbox."""
        client.force_login(user)
        response = patch(client, {**REGISTERED, "is_cso": True})

        assert response.status_code == 400
        assert "confirm_cso_criteria" in response.json()
        user.refresh_from_db()
        assert user.is_cso is False

    def test_withdrawing_clears_the_declaration_date(self, client, user):
        """The record must not show a date for a role that is not held."""
        client.force_login(user)
        patch(client, AS_CSO)
        patch(client, {**REGISTERED, "is_cso": False})

        user.refresh_from_db()
        assert user.is_cso is False
        assert user.cso_declared_at is None

    def test_an_unrelated_edit_does_not_move_the_declaration_date(self, client, user):
        """Saving a job title should not look like a fresh declaration."""
        client.force_login(user)
        patch(client, AS_CSO)
        user.refresh_from_db()
        first = user.cso_declared_at

        patch(client, {**AS_CSO, "job_role": "Lead CSO"})
        user.refresh_from_db()
        assert user.cso_declared_at == first

    def test_the_api_and_the_form_enforce_the_same_rules(self, client, user):
        """Both refuse a declaration without a registration.

        Checked rather than assumed: two interfaces onto one safety-relevant
        rule is how the rule ends up meaning two different things.
        """
        from app.accounts.forms import ProfileForm

        form = ProfileForm(
            data={**BASE, "is_cso": "on", "confirm_cso_criteria": "on"}, instance=user
        )
        assert not form.is_valid()

        client.force_login(user)
        assert (
            patch(client, {**BASE, "is_cso": True, "confirm_cso_criteria": True}).status_code == 400
        )
