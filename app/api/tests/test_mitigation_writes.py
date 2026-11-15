"""Mitigation authoring uses real repositories and the shared safety boundary."""

import pytest
from django.core.exceptions import PermissionDenied
from django.test import Client
from django.urls import reverse

from app.api.tests.test_hazard_writes import VALUES as HAZARD
from app.api.tests.test_safety_files import a_safety_file, make_user
from app.safetyfiles.models import Visibility
from app.safetyfiles.services import save_hazard, save_mitigation
from safety_file.errors import ValidationError

pytestmark = pytest.mark.django_db

VALUES = {
    "title": "Fictional daily safety-netting",
    "owner": "responsible@riverbank.example.nhs.uk",
    "control_type": "procedural",
    "status": "proposed",
    "hazards": ["HAZ-001"],
    "evidence": "A fictional test report.\n",
    "body": "## Notes\n\nFictional evidence only.\n",
}


@pytest.fixture
def owner():
    return make_user("owner@riverbank.example.nhs.uk")


@pytest.fixture
def file(owner):
    file = a_safety_file(owner)
    save_hazard(file, owner, HAZARD, expected_head=file.repository().head_sha)
    return file


def url(file, identifier=None):
    return reverse(
        "v1:mitigation-detail" if identifier else "v1:mitigation-list",
        kwargs={"slug": file.slug, **({"mitigation_id": identifier} if identifier else {})},
    )


def create(client, file, **overrides):
    return client.post(
        url(file),
        {**VALUES, "expected_head": file.repository().head_sha, **overrides},
        content_type="application/json",
    )


def patch(client, file, **values):
    return client.patch(
        url(file, "MIT-001"),
        {"expected_head": file.repository().head_sha, **values},
        content_type="application/json",
    )


def test_create_updates_both_links_and_log_in_one_attributable_commit(client, owner, file):
    client.force_login(owner)
    repository = file.repository()
    before = repository.hazard("HAZ-001")
    response = create(client, file)
    assert response.status_code == 201, response.content
    assert response.json()["mitigation"]["id"] == "MIT-001"
    assert len(repository.history()) == 3
    assert repository.hazard("HAZ-001").mitigations == ["MIT-001"]
    assert repository.mitigation("MIT-001").hazards == ["HAZ-001"]
    assert repository.hazard("HAZ-001").initial == before.initial
    assert repository.hazard("HAZ-001").residual == before.residual
    assert repository.history()[0].author_email == owner.email
    assert repository.validate() == []
    assert repository.is_clean
    detail = client.get(url(file, "MIT-001")).json()
    assert detail["head_sha"] == response.json()["head_sha"]
    assert detail["can_edit"] is True
    assert detail["hazards"][0]["id"] == "HAZ-001"


def test_full_form_noop_preserves_evidence_and_identity_then_rename_follows_history(
    client, owner, file
):
    client.force_login(owner)
    create(client, file)
    original = file.repository().mitigation("MIT-001")
    head = file.repository().head_sha
    assert patch(client, file, **VALUES).status_code == 200
    assert file.repository().head_sha == head
    assert patch(client, file, title="Retitled fictional control").status_code == 200
    mitigation = file.repository().mitigation("MIT-001")
    assert mitigation.created == original.created
    assert mitigation.evidence == VALUES["evidence"]
    assert mitigation.body == original.body
    assert mitigation.hazards == original.hazards
    assert len(client.get(url(file, "MIT-001")).json()["history"]) == 2


def test_unlinking_updates_reverse_link_without_removing_hazard_or_evidence(client, owner, file):
    client.force_login(owner)
    create(client, file)
    assert patch(client, file, hazards=[]).status_code == 200
    assert file.repository().hazard("HAZ-001").mitigations == []
    assert file.repository().mitigation("MIT-001").evidence == VALUES["evidence"]
    assert file.repository().validate() == []


@pytest.mark.parametrize("status", ["implemented", "verified"])
def test_implemented_and_verified_require_recorded_evidence(client, owner, file, status):
    client.force_login(owner)
    assert create(client, file, status=status, evidence=" \n ").status_code == 400
    assert file.repository().mitigations() == []
    assert create(client, file, status=status).status_code == 201


@pytest.mark.parametrize(
    "values",
    [
        {"hazards": ["HAZ-999"]},
        {"hazards": ["HAZ-001", "HAZ-001"]},
        {"hazards": [True]},
        {"hazards": None},
        {"control_type": "unknown"},
        {"title": " \n "},
        {"status": "done"},
        {"id": "MIT-999"},
        {"created": "2026-01-01"},
        {"risk_level": 1},
        {"initial": {"severity": 1}},
    ],
)
def test_invalid_payload_never_writes_half_a_relationship(client, owner, file, values):
    client.force_login(owner)
    before = file.repository().head_sha
    assert create(client, file, **values).status_code == 400
    assert file.repository().head_sha == before
    assert file.repository().is_clean


def test_stale_create_or_edit_is_rejected_without_an_identifier_or_lost_links(client, owner, file):
    client.force_login(owner)
    stale = file.repository().head_sha
    assert create(client, file).status_code == 201
    assert create(client, file, expected_head=stale).status_code == 409
    assert patch(client, file, hazards=[], expected_head=stale).status_code == 409
    assert file.repository().next_mitigation_id() == "MIT-002"
    assert file.repository().hazard("HAZ-001").mitigations == ["MIT-001"]


def test_patch_cannot_omit_the_opened_version(client, owner, file):
    client.force_login(owner)
    create(client, file)
    assert (
        client.patch(
            url(file, "MIT-001"), {"title": "Unversioned"}, content_type="application/json"
        ).status_code
        == 400
    )


@pytest.mark.parametrize("public", [False, True])
def test_readers_cannot_edit_even_a_public_file(client, owner, file, public):
    client.force_login(owner)
    create(client, file)
    reader = make_user("reader@riverbank.example.nhs.uk")
    if public:
        file.visibility = Visibility.PUBLIC
        file.save()
    client.force_login(reader)
    before = file.repository().head_sha
    assert create(client, file).status_code == (403 if public else 404)
    assert patch(client, file, evidence="Not mine").status_code == (403 if public else 404)
    read = client.get(url(file, "MIT-001"))
    assert read.status_code == (200 if public else 404)
    if public:
        assert read.json()["can_edit"] is False
    assert file.repository().head_sha == before


def test_anonymous_unverified_and_missing_records_do_not_disclose_evidence(client, owner, file):
    assert create(client, file).status_code == 403
    client.force_login(make_user("unverified@riverbank.example.nhs.uk", verified=False))
    assert create(client, file).status_code == 403
    client.force_login(owner)
    assert client.get(url(file, "MIT-999")).status_code == 404
    assert (
        client.patch(
            url(file, "MIT-999"),
            {"expected_head": file.repository().head_sha},
            content_type="application/json",
        ).status_code
        == 404
    )


def test_service_checks_permissions_fields_and_version_independently_of_http(owner, file):
    other = make_user("other@riverbank.example.nhs.uk")
    with pytest.raises(PermissionDenied):
        save_mitigation(file, other, VALUES, expected_head=file.repository().head_sha)
    with pytest.raises(ValidationError):
        save_mitigation(
            file, owner, {**VALUES, "risk_level": 1}, expected_head=file.repository().head_sha
        )
    with pytest.raises(ValidationError):
        save_mitigation(file, owner, VALUES, expected_head="")


def test_csrf_is_required_for_mitigation_saves(owner, file):
    client = Client(enforce_csrf_checks=True)
    client.force_login(owner)
    assert create(client, file).status_code == 403
    client.get(reverse("v1:session"))
    assert (
        client.post(
            url(file),
            {**VALUES, "expected_head": file.repository().head_sha},
            content_type="application/json",
            headers={"X-CSRFToken": client.cookies["csrftoken"].value},
        ).status_code
        == 201
    )


def test_options_are_canonical_and_no_deletion_is_offered(client, owner, file):
    from safety_file.models import CONTROL_TYPES, MITIGATION_STATUSES

    assert client.get(reverse("v1:mitigation-options")).status_code == 403
    client.force_login(owner)
    assert client.get(reverse("v1:mitigation-options")).json() == {
        "control_types": list(CONTROL_TYPES),
        "statuses": list(MITIGATION_STATUSES),
    }
    create(client, file)
    assert client.delete(url(file, "MIT-001")).status_code == 405


def test_commit_failure_and_dirty_repository_are_never_reported_as_saved(
    client, owner, file, monkeypatch
):
    from safety_file import git
    from safety_file.errors import GitError

    def fail(*args, **kwargs):
        raise GitError(["commit"], 1, "simulated failure")

    client.force_login(owner)
    before = file.repository().head_sha
    monkeypatch.setattr(git, "commit_all", fail)
    assert create(client, file).status_code == 503
    assert file.repository().head_sha == before
    assert not file.repository().is_clean
    assert create(client, file).status_code == 409
    assert client.get(url(file, "MIT-001")).status_code == 503
