"""Tests for the safety file endpoints.

The test that matters most is `test_create_writes_a_real_repository`. The whole
case for having an API at all rests on the HTTP layer calling the services
rather than the models, and a serializer that wrote an index row directly would
pass every other test in this file while producing a safety file that exists in
the database and nowhere on disk.
"""

from __future__ import annotations

import shutil

import pytest
from django.urls import reverse

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile, Visibility
from app.safetyfiles.services import SafetyFileDetails, create_safety_file

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"

PAYLOAD = {
    "name": "BP@Home remote blood pressure monitoring",
    "standard": "DCB0160",
    "organisation": "Riverbank Health Federation",
    "intended_use": "Remote blood pressure monitoring for hypertension review.",
}


def make_user(email: str, *, verified: bool = True, first: str = "Anita", last: str = "Patel"):
    user = User.objects.create_user(
        email=email, password=PASSWORD, first_name=first, last_name=last
    )
    if verified:
        user.is_verified = True
        user.save(update_fields=["is_verified"])
    return user


@pytest.fixture
def cso(db):
    return make_user("a.patel@riverbank.example.nhs.uk")


@pytest.fixture
def other_cso(db):
    return make_user("j.okafor@riverbank.example.nhs.uk", first="Joseph", last="Okafor")


@pytest.fixture
def unverified(db):
    return make_user("s.whitlock@riverbank.example.nhs.uk", verified=False)


def a_safety_file(owner, **overrides) -> SafetyFile:
    return create_safety_file(SafetyFileDetails(**{**PAYLOAD, **overrides}), owner)


class TestAccess:
    def test_listing_requires_sign_in(self, client):
        assert client.get(reverse("v1:safety-file-list")).status_code == 403

    def test_listing_requires_a_confirmed_email_address(self, client, unverified):
        """Attribution is the point, and an unconfirmed address cannot carry it.

        403 with a message rather than the template layer's redirect: an API
        client cannot be sent to a notice page.
        """
        client.force_login(unverified)
        response = client.get(reverse("v1:safety-file-list"))
        assert response.status_code == 403
        assert "Confirm your email address" in response.json()["detail"]

    def test_creating_requires_a_confirmed_email_address(self, client, unverified):
        client.force_login(unverified)
        response = client.post(
            reverse("v1:safety-file-list"), PAYLOAD, content_type="application/json"
        )
        assert response.status_code == 403
        assert SafetyFile.objects.count() == 0


class TestListing:
    def test_lists_the_users_own_files(self, client, cso):
        a_safety_file(cso)
        client.force_login(cso)
        body = client.get(reverse("v1:safety-file-list")).json()
        assert [f["name"] for f in body] == [PAYLOAD["name"]]

    def test_does_not_list_another_users_private_file(self, client, cso, other_cso):
        a_safety_file(other_cso, name="Confidential deployment")
        client.force_login(cso)
        assert client.get(reverse("v1:safety-file-list")).json() == []

    def test_lists_another_users_published_file(self, client, cso, other_cso):
        published = a_safety_file(other_cso, name="A published system")
        published.visibility = Visibility.PUBLIC
        published.save(update_fields=["visibility"])

        client.force_login(cso)
        body = client.get(reverse("v1:safety-file-list")).json()
        assert [f["name"] for f in body] == ["A published system"]

    def test_the_api_and_the_template_view_agree_on_who_sees_what(self, client, cso, other_cso):
        """Both call `visible_to`, which is why this can be asserted at all.

        It is checked rather than assumed because a permission rule expressed
        in two places is one that will eventually disagree with itself, and the
        disagreement would be silent.
        """
        a_safety_file(cso, name="Mine")
        a_safety_file(other_cso, name="Theirs")

        client.force_login(cso)
        from_api = {f["slug"] for f in client.get(reverse("v1:safety-file-list")).json()}
        html = client.get(reverse("safetyfiles:list")).content.decode()

        assert from_api == {"mine"}
        assert "Theirs" not in html


class TestCreating:
    def test_create_writes_a_real_repository(self, client, cso):
        """The API must call the service, not the model.

        `create_safety_file()` writes the Git repository *before* the index
        row. A serializer that created the row directly would leave an index
        entry for a safety file that was never written - which is the exact
        inversion of "Git is the system of record", and would look like working
        code. See ADR 0003.
        """
        client.force_login(cso)
        response = client.post(
            reverse("v1:safety-file-list"), PAYLOAD, content_type="application/json"
        )
        assert response.status_code == 201

        safety_file = SafetyFile.objects.get()
        assert safety_file.exists_on_disk, "the row exists but no repository was written"
        assert (safety_file.repository_path / ".turva" / "manifest.yaml").is_file()

    def test_the_repository_and_the_row_agree_on_identity(self, client, cso):
        client.force_login(cso)
        client.post(reverse("v1:safety-file-list"), PAYLOAD, content_type="application/json")

        safety_file = SafetyFile.objects.get()
        assert safety_file.repository().manifest.project_id == str(safety_file.id)

    def test_the_first_commit_is_attributed_to_the_creator(self, client, cso):
        client.force_login(cso)
        client.post(reverse("v1:safety-file-list"), PAYLOAD, content_type="application/json")

        commit = SafetyFile.objects.get().repository().history()[0]
        assert commit.author_name == "Anita Patel"
        assert commit.author_email == cso.email

    def test_ownership_comes_from_the_session_not_the_payload(self, client, cso, other_cso):
        client.force_login(cso)
        client.post(
            reverse("v1:safety-file-list"),
            {**PAYLOAD, "owner": str(other_cso.pk)},
            content_type="application/json",
        )
        assert SafetyFile.objects.get().owner == cso

    def test_visibility_cannot_be_set_on_creation(self, client, cso):
        """Publishing is a governance decision, and the safe default for an
        unreviewed draft is not to publish it."""
        client.force_login(cso)
        client.post(
            reverse("v1:safety-file-list"),
            {**PAYLOAD, "visibility": "public"},
            content_type="application/json",
        )
        assert SafetyFile.objects.get().visibility == Visibility.PRIVATE

    def test_an_incomplete_payload_creates_nothing(self, client, cso):
        client.force_login(cso)
        response = client.post(
            reverse("v1:safety-file-list"),
            {**PAYLOAD, "name": ""},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert SafetyFile.objects.count() == 0

    def test_a_storage_failure_is_reported_rather_than_raised(self, client, cso, monkeypatch):
        from app.api import views
        from safety_file.errors import GitError

        def explode(*args, **kwargs):
            raise GitError(["commit"], 1, "disk full")

        monkeypatch.setattr(views, "create_safety_file", explode)
        client.force_login(cso)
        response = client.post(
            reverse("v1:safety-file-list"), PAYLOAD, content_type="application/json"
        )

        assert response.status_code == 503
        assert "could not create the safety file" in response.json()["detail"]
        assert SafetyFile.objects.count() == 0


class TestDetail:
    def test_hazards_and_history_come_from_the_repository(self, client, cso):
        """Not from the database, so the response cannot show a stale or
        invented figure."""
        from datetime import date

        from safety_file import Author
        from safety_file.models import Assessment, Hazard

        safety_file = a_safety_file(cso)
        safety_file.repository().save_hazard(
            Hazard(
                id="HAZ-001",
                title="Reading not escalated",
                status="open",
                owner=cso.email,
                created=date(2026, 2, 11),
                updated=date(2026, 2, 11),
                initial=Assessment(severity=4, likelihood=3),
                residual=Assessment(severity=4, likelihood=1),
            ),
            Author(name=cso.get_full_name(), email=cso.email),
        )

        client.force_login(cso)
        body = client.get(
            reverse("v1:safety-file-detail", kwargs={"slug": safety_file.slug})
        ).json()

        assert [h["id"] for h in body["hazards"]] == ["HAZ-001"]
        assert body["head_sha"]
        assert body["history"][0]["author_name"] == "Anita Patel"

    def test_risk_level_is_derived_and_sent_with_the_assessment(self, client, cso):
        """Severity and likelihood are captured; risk level is calculated.

        S4 L3 derives 4, S4 L1 derives 2. The client is never asked for a risk
        level and cannot send one.
        """
        from datetime import date

        from safety_file import Author
        from safety_file.models import Assessment, Hazard

        safety_file = a_safety_file(cso)
        safety_file.repository().save_hazard(
            Hazard(
                id="HAZ-001",
                title="Reading not escalated",
                status="open",
                owner=cso.email,
                created=date(2026, 2, 11),
                updated=date(2026, 2, 11),
                initial=Assessment(severity=4, likelihood=3),
                residual=Assessment(severity=4, likelihood=1),
            ),
            Author(name=cso.get_full_name(), email=cso.email),
        )

        client.force_login(cso)
        body = client.get(
            reverse("v1:safety-file-detail", kwargs={"slug": safety_file.slug})
        ).json()

        hazard = body["hazards"][0]
        assert hazard["initial"] == {"severity": 4, "likelihood": 3, "risk_level": 4}
        assert hazard["residual"] == {"severity": 4, "likelihood": 1, "risk_level": 2}

    def test_a_new_file_reports_no_hazards_without_erroring(self, client, cso):
        safety_file = a_safety_file(cso)
        client.force_login(cso)
        body = client.get(
            reverse("v1:safety-file-detail", kwargs={"slug": safety_file.slug})
        ).json()
        assert body["hazards"] == []
        assert body["problems"] == []

    def test_another_users_private_file_is_not_found(self, client, cso, other_cso):
        """404 rather than 403: a 403 confirms the thing exists."""
        hidden = a_safety_file(other_cso, name="Confidential deployment")
        client.force_login(cso)
        response = client.get(reverse("v1:safety-file-detail", kwargs={"slug": hidden.slug}))
        assert response.status_code == 404

    def test_a_missing_repository_is_explained_rather_than_crashing(self, client, cso):
        """The index knows about something that is not on disk.

        A restore that missed the volume would do this. It needs a person, so
        the response has to say so rather than 500.
        """
        safety_file = a_safety_file(cso)
        shutil.rmtree(safety_file.repository_path)

        client.force_login(cso)
        response = client.get(reverse("v1:safety-file-detail", kwargs={"slug": safety_file.slug}))

        assert response.status_code == 200
        body = response.json()
        assert body["repository_missing"] is True
        assert safety_file.slug in body["repository_path"]
