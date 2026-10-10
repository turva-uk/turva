"""Tests for the safety file list, create and detail views.

Access control gets disproportionate attention here on purpose. A safety file
can describe weaknesses in a live healthcare system, and the customer hand-off
in phase one will add a second role that reaches these same views - so the rule
about who sees what needs to be pinned down before anything is layered on it.
"""

from __future__ import annotations

import re

import pytest
from django.http import HttpResponse
from django.urls import reverse

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile, Visibility
from app.safetyfiles.services import SafetyFileDetails, create_safety_file

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"

FORM = {
    "name": "BP@Home remote blood pressure monitoring",
    "standard": "DCB0160",
    "organisation": "Riverbank Health Federation",
    "intended_use": "Remote blood pressure monitoring for hypertension review.",
}


def prose(response: HttpResponse) -> str:
    """Rendered text with runs of whitespace collapsed.

    Templates wrap prose across lines, so asserting an exact phrase against the
    raw HTML breaks whenever a sentence reflows. That makes tests brittle in a
    way that discourages editing templates, which is the opposite of useful.
    """
    return re.sub(r"\s+", " ", response.content.decode())


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
    details = SafetyFileDetails(**{**FORM, **overrides})
    return create_safety_file(details, owner)


class TestListing:
    def test_requires_sign_in(self, client):
        response = client.get(reverse("safetyfiles:list"))
        assert response.status_code == 302
        assert reverse("accounts:login") in response["Location"]

    def test_requires_a_confirmed_email_address(self, client, unverified):
        """Attribution is the point. An unconfirmed address cannot carry it."""
        client.force_login(unverified)
        response = client.get(reverse("safetyfiles:list"))
        assert response["Location"] == reverse("accounts:verify_notice")

    def test_empty_state_explains_what_a_safety_file_is(self, client, cso):
        client.force_login(cso)
        body = prose(client.get(reverse("safetyfiles:list")))
        assert "You have no safety files yet" in body
        assert "Git repository holding the hazards" in body

    def test_lists_the_users_own_files(self, client, cso):
        a_safety_file(cso)
        client.force_login(cso)
        body = client.get(reverse("safetyfiles:list")).content.decode()
        assert FORM["name"] in body

    def test_does_not_list_another_users_private_file(self, client, cso, other_cso):
        a_safety_file(other_cso, name="Someone else's system")
        client.force_login(cso)
        body = client.get(reverse("safetyfiles:list")).content.decode()
        assert "Someone else" not in body

    def test_lists_another_users_published_file(self, client, cso, other_cso):
        published = a_safety_file(other_cso, name="A published system")
        published.visibility = Visibility.PUBLIC
        published.save(update_fields=["visibility"])

        client.force_login(cso)
        assert "A published system" in client.get(reverse("safetyfiles:list")).content.decode()


class TestCreating:
    def test_requires_a_confirmed_email_address(self, client, unverified):
        client.force_login(unverified)
        response = client.post(reverse("safetyfiles:create"), FORM)
        assert response["Location"] == reverse("accounts:verify_notice")
        assert SafetyFile.objects.count() == 0

    def test_get_renders_the_form(self, client, cso):
        client.force_login(cso)
        response = client.get(reverse("safetyfiles:create"))
        assert response.status_code == 200
        assert set(response.context["form"].fields) == {
            "name",
            "standard",
            "organisation",
            "intended_use",
        }

    def test_creating_makes_a_repository_and_redirects_to_it(self, client, cso):
        client.force_login(cso)
        response = client.post(reverse("safetyfiles:create"), FORM)

        safety_file = SafetyFile.objects.get()
        assert response["Location"] == safety_file.get_absolute_url()
        assert safety_file.exists_on_disk
        assert safety_file.owner == cso

    def test_the_new_file_is_owned_by_the_creator_not_a_submitted_value(
        self, client, cso, other_cso
    ):
        """Ownership comes from the session, never from the form."""
        client.force_login(cso)
        client.post(reverse("safetyfiles:create"), {**FORM, "owner": other_cso.pk})
        assert SafetyFile.objects.get().owner == cso

    def test_an_incomplete_form_creates_nothing(self, client, cso):
        client.force_login(cso)
        response = client.post(reverse("safetyfiles:create"), {**FORM, "name": ""})
        assert response.status_code == 200
        assert SafetyFile.objects.count() == 0

    def test_a_storage_failure_is_reported_not_raised(self, client, cso, monkeypatch):
        """A 500 on this form loses the user's typing for no reason."""
        from app.safetyfiles import views
        from safety_file.errors import GitError

        def explode(*args, **kwargs):
            raise GitError(["commit"], 1, "disk full")

        monkeypatch.setattr(views, "create_safety_file", explode)
        client.force_login(cso)
        response = client.post(reverse("safetyfiles:create"), FORM, follow=True)

        assert response.status_code == 200
        assert "could not create the safety file" in prose(response)
        assert SafetyFile.objects.count() == 0


class TestDetail:
    def test_shows_the_audit_trail_from_the_repository(self, client, cso):
        safety_file = a_safety_file(cso)
        client.force_login(cso)
        body = client.get(safety_file.get_absolute_url()).content.decode()

        assert "create safety file" in body
        assert "Anita Patel" in body, "the commit author should be shown"

    def test_shows_the_on_disk_location(self, client, cso):
        """People will want to go and look at the repository."""
        safety_file = a_safety_file(cso)
        client.force_login(cso)
        body = client.get(safety_file.get_absolute_url()).content.decode()
        assert safety_file.slug in body

    def test_a_new_file_says_an_empty_hazard_log_is_not_reassurance(self, client, cso):
        safety_file = a_safety_file(cso)
        client.force_login(cso)
        body = prose(client.get(safety_file.get_absolute_url()))
        assert "No hazards recorded yet" in body
        assert "An empty hazard log is not evidence of a safe system" in body

    def test_another_users_private_file_is_not_found(self, client, cso, other_cso):
        """404 rather than 403: a 403 confirms the thing exists."""
        hidden = a_safety_file(other_cso, name="Confidential deployment")
        client.force_login(cso)
        assert client.get(hidden.get_absolute_url()).status_code == 404

    def test_a_published_file_is_visible_to_another_user(self, client, cso, other_cso):
        published = a_safety_file(other_cso, name="A published system")
        published.visibility = Visibility.PUBLIC
        published.save(update_fields=["visibility"])
        client.force_login(cso)
        assert client.get(published.get_absolute_url()).status_code == 200

    def test_a_missing_repository_is_explained_rather_than_crashing(self, client, cso):
        """The index knows about something that is not on disk.

        A restore that missed the volume would do this. The page has to say so,
        because the fix needs a person and deleting the row would destroy the
        evidence that the safety file ever existed.
        """
        import shutil

        safety_file = a_safety_file(cso)
        shutil.rmtree(safety_file.repository_path)

        client.force_login(cso)
        response = client.get(safety_file.get_absolute_url())
        assert response.status_code == 200
        body = prose(response)
        assert "repository for this safety file is not on disk" in body
        assert "Do not delete this entry" in body


class TestRiskIsNeverColourAlone:
    def test_risk_levels_are_rendered_with_their_numbers(self, client, cso):
        """Safety-relevant information must not depend on distinguishing hues."""
        from datetime import date

        from safety_file import Author
        from safety_file.models import Assessment, Hazard

        safety_file = a_safety_file(cso)
        repository = safety_file.repository()
        repository.save_hazard(
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
        body = client.get(safety_file.get_absolute_url()).content.decode()

        assert "S4 L3" in body and "S4 L1" in body
        # derived: S4 L3 -> 4, S4 L1 -> 2
        assert "<strong>4</strong>" in body
        assert "<strong>2</strong>" in body
