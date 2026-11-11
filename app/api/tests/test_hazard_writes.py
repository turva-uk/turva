"""Whole-form hazard saves exercise real Git, attribution and stale guards."""

from __future__ import annotations

from contextlib import contextmanager
from itertools import product

import pytest
from django.test import Client
from django.urls import reverse

from app.api.tests.test_safety_files import a_safety_file, make_user
from app.safetyfiles.models import Visibility
from app.safetyfiles.services import save_hazard
from safety_file.errors import RepositoryBusyError, ValidationError
from safety_file.repository import SafetyFileRepository
from safety_file.risk import derive_risk_level

pytestmark = pytest.mark.django_db

VALUES = {
    "title": "Fictional reading not escalated",
    "owner": "responsible@riverbank.example.nhs.uk",
    "cause": "The daily review is missed.",
    "effect": "The review is delayed.",
    "harm": "Avoidable harm from delayed treatment.",
    "status": "open",
    "initial": {"severity": 4, "likelihood": 3},
    "residual": {"severity": 4, "likelihood": 1},
    "justification": "Fictional daily review and safety-netting.",
    "body": "## Notes\n\nFictional test only.\n",
}


@pytest.fixture
def owner():
    return make_user("owner@riverbank.example.nhs.uk")


@pytest.fixture
def file(owner):
    return a_safety_file(owner)


def url(file, identifier=None):
    return reverse(
        "v1:hazard-detail" if identifier else "v1:hazard-list",
        kwargs={"slug": file.slug, **({"hazard_id": identifier} if identifier else {})},
    )


def create(client, file, **overrides):
    return client.post(
        url(file),
        {**VALUES, "expected_head": file.repository().head_sha, **overrides},
        content_type="application/json",
    )


def patch(client, file, identifier="HAZ-001", **values):
    return client.patch(
        url(file, identifier),
        {"expected_head": file.repository().head_sha, **values},
        content_type="application/json",
    )


def test_create_commits_the_hazard_and_generated_log_to_the_acting_user(client, owner, file):
    client.force_login(owner)
    response = create(client, file)
    assert response.status_code == 201
    body = response.json()
    assert body["hazard"]["id"] == "HAZ-001"
    assert body["hazard"]["residual"]["risk_level"] == 2
    repository = file.repository()
    assert repository.is_clean
    assert repository.history()[0].author_email == owner.email
    assert repository.hazard("HAZ-001").owner == VALUES["owner"]
    assert VALUES["title"] in (repository.root / "docs/hazards/index.md").read_text()
    assert response.json()["head_sha"] == repository.head_sha


def test_edit_preserves_identity_creation_and_attribution_across_a_rename(client, owner, file):
    client.force_login(owner)
    create(client, file)
    original = file.repository().hazard("HAZ-001")
    response = patch(client, file, title="Corrected fictional hazard title")
    assert response.status_code == 200
    updated = file.repository().hazard("HAZ-001")
    assert updated.id == original.id
    assert updated.created == original.created
    assert updated.body == original.body
    assert updated.mitigations == original.mitigations
    assert len(file.repository().hazard_history(updated.id)) == 2
    assert file.repository().is_clean


def test_edit_cannot_unlink_mitigation_evidence(client, owner, file):
    from app.safetyfiles.services import author_for
    from safety_file.models import Mitigation

    client.force_login(owner)
    create(client, file)
    repository = file.repository()
    original = repository.hazard("HAZ-001")
    repository.save_mitigation(
        Mitigation(
            id="MIT-001",
            title="Fictional safety-netting",
            owner=owner.email,
            status="implemented",
            control_type="procedural",
            hazards=[original.id],
            created=original.created,
            updated=original.updated,
            evidence="Fictional review report.",
        ),
        author_for(owner),
    )
    original.mitigations = ["MIT-001"]
    repository.save_hazard(original, author_for(owner))
    assert patch(client, file, title="Corrected hazard").status_code == 200
    assert repository.hazard("HAZ-001").mitigations == ["MIT-001"]
    assert repository.validate() == []


def test_owner_actions_are_reported_truthfully_for_readers(client, owner, file):
    client.force_login(owner)
    create(client, file)
    assert client.get(url(file, "HAZ-001")).json()["can_edit"] is True
    other = make_user("reader@riverbank.example.nhs.uk")
    file.visibility = Visibility.PUBLIC
    file.save()
    client.force_login(other)
    assert client.get(url(file, "HAZ-001")).json()["can_edit"] is False
    assert patch(client, file, title="Reader's attempted edit").status_code == 403


def test_commit_failure_reports_uncertainty_and_preserves_the_work_for_inspection(
    client, owner, file, monkeypatch
):
    from safety_file import git
    from safety_file.errors import GitError

    def fail(*args, **kwargs):
        raise GitError(["commit"], 1, "simulated write failure")

    client.force_login(owner)
    before = file.repository().head_sha
    monkeypatch.setattr(git, "commit_all", fail)
    response = create(client, file)
    assert response.status_code == 503
    assert "Do not assume the changes were saved" in response.json()["detail"]
    assert file.repository().head_sha == before
    assert not file.repository().is_clean
    assert create(client, file).status_code == 409


def test_unchanged_save_creates_no_commit(client, owner, file):
    client.force_login(owner)
    create(client, file)
    before = file.repository().head_sha
    assert patch(client, file, title=VALUES["title"]).status_code == 200
    assert file.repository().head_sha == before


def test_full_form_noop_preserves_recorded_paragraph_whitespace(client, owner, file):
    client.force_login(owner)
    values = {**VALUES, "cause": "A recorded paragraph.\n", "justification": "A recorded reason.\n"}
    assert create(client, file, **values).status_code == 201
    before = file.repository().head_sha
    assert patch(client, file, **values).status_code == 200
    assert file.repository().head_sha == before
    assert file.repository().hazard("HAZ-001").cause == values["cause"]


@pytest.mark.parametrize("field", ["title", "cause", "effect", "harm"])
def test_whitespace_only_does_not_satisfy_required_safety_content(client, owner, file, field):
    client.force_login(owner)
    assert create(client, file, **{field: " \n "}).status_code == 400
    assert file.repository().hazards() == []


@pytest.mark.parametrize("field", ["id", "created", "updated", "mitigations", "risk_level"])
def test_system_owned_fields_cannot_be_supplied(client, owner, file, field):
    client.force_login(owner)
    before = file.repository().head_sha
    response = create(client, file, **{field: "not-client-controlled"})
    assert response.status_code == 400
    assert file.repository().head_sha == before
    assert file.repository().is_clean


@pytest.mark.parametrize("value", [True, False, "4", 4.0, 0, 6, None])
def test_scores_are_strict_json_integers_never_coerced(client, owner, file, value):
    client.force_login(owner)
    before = file.repository().head_sha
    assert create(client, file, initial={"severity": value, "likelihood": 3}).status_code == 400
    assert file.repository().head_sha == before
    assert file.repository().is_clean


def test_derived_risk_cannot_be_supplied_inside_an_assessment(client, owner, file):
    client.force_login(owner)
    assert create(client, file, initial={**VALUES["initial"], "risk_level": 1}).status_code == 400
    assert file.repository().hazards() == []


@pytest.mark.parametrize(
    "residual", [{"severity": 5, "likelihood": 1}, {"severity": 4, "likelihood": 4}]
)
def test_residual_scores_cannot_exceed_the_initial_assessment(client, owner, file, residual):
    client.force_login(owner)
    assert create(client, file, residual=residual).status_code == 400
    assert file.repository().hazards() == []
    assert file.repository().is_clean


def test_closing_requires_justification_and_does_not_delete_the_hazard(client, owner, file):
    client.force_login(owner)
    create(client, file)
    before = file.repository().head_sha
    assert patch(client, file, status="closed", justification="").status_code == 400
    assert file.repository().head_sha == before
    assert (
        patch(
            client, file, status="closed", justification="Fictional pathway withdrawn."
        ).status_code
        == 200
    )
    assert file.repository().hazard("HAZ-001").status == "closed"
    assert client.delete(url(file, "HAZ-001")).status_code == 405


def test_an_incomplete_nested_patch_is_rejected_without_corrupting_the_file(client, owner, file):
    client.force_login(owner)
    create(client, file)
    before = file.repository().head_sha
    assert patch(client, file, initial={"severity": 3}).status_code == 400
    assert file.repository().head_sha == before


def test_a_stale_form_cannot_overwrite_another_save(client, owner, file):
    client.force_login(owner)
    create(client, file)
    old = file.repository().head_sha
    assert patch(client, file, cause="A newer recorded cause.").status_code == 200
    response = patch(client, file, expected_head=old, cause="A stale draft.")
    assert response.status_code == 409
    assert file.repository().hazard("HAZ-001").cause == "A newer recorded cause."
    assert file.repository().is_clean


def test_a_stale_create_does_not_consume_an_identifier(client, owner, file):
    client.force_login(owner)
    old = file.repository().head_sha
    create(client, file)
    assert create(client, file, expected_head=old).status_code == 409
    assert create(client, file).json()["hazard"]["id"] == "HAZ-002"


def test_patch_always_requires_the_opened_version(client, owner, file):
    client.force_login(owner)
    create(client, file)
    response = client.patch(
        url(file, "HAZ-001"), {"title": "Unversioned"}, content_type="application/json"
    )
    assert response.status_code == 400
    assert "expected_head" in response.json()


@pytest.mark.parametrize("public", [False, True])
def test_only_the_owner_can_write_even_when_the_file_is_public(client, owner, file, public):
    other = make_user("other@riverbank.example.nhs.uk")
    if public:
        file.visibility = Visibility.PUBLIC
        file.save()
    client.force_login(other)
    before = file.repository().head_sha
    assert create(client, file).status_code == (403 if public else 404)
    assert file.repository().head_sha == before
    assert file.repository().is_clean


def test_service_itself_enforces_ownership_and_system_owned_fields(owner, file):
    from django.core.exceptions import PermissionDenied

    other = make_user("other@riverbank.example.nhs.uk")
    with pytest.raises(PermissionDenied):
        save_hazard(file, other, VALUES, expected_head=file.repository().head_sha)
    with pytest.raises(ValidationError):
        save_hazard(
            file, owner, {**VALUES, "id": "HAZ-999"}, expected_head=file.repository().head_sha
        )
    assert file.repository().hazards() == []


def test_dirty_work_is_not_captured_or_presented_as_a_committed_version(client, owner, file):
    client.force_login(owner)
    before = file.repository().head_sha
    note = file.repository_path / "docs/uncommitted.md"
    note.write_text("Unattributed test edit.")
    assert create(client, file).status_code == 409
    assert file.repository().head_sha == before
    assert note.read_text() == "Unattributed test edit."
    detail_url = reverse("v1:safety-file-detail", kwargs={"slug": file.slug})
    assert client.get(detail_url).status_code == 503
    assert client.get(file.get_absolute_url()).status_code == 503


def test_anonymous_and_unverified_users_cannot_create(client, file):
    assert create(client, file).status_code == 403
    unverified = make_user("unverified@riverbank.example.nhs.uk", verified=False)
    client.force_login(unverified)
    assert create(client, file).status_code == 403


def test_csrf_is_required_on_hazard_saves(owner, file):
    strict = Client(enforce_csrf_checks=True)
    strict.force_login(owner)
    assert create(strict, file).status_code == 403
    strict.get(reverse("v1:session"))
    payload = {**VALUES, "expected_head": file.repository().head_sha}
    assert (
        strict.post(
            url(file),
            payload,
            content_type="application/json",
            headers={"X-CSRFToken": strict.cookies["csrftoken"].value},
        ).status_code
        == 201
    )


def test_busy_repository_is_retryable_without_a_write(client, owner, file, monkeypatch):
    @contextmanager
    def busy(*args, **kwargs):
        raise RepositoryBusyError("This safety file is busy. Try again.")
        yield

    monkeypatch.setattr(SafetyFileRepository, "edit", busy)
    client.force_login(owner)
    assert create(client, file).status_code == 503
    assert file.repository().hazards() == []


@pytest.mark.parametrize(("severity", "likelihood"), list(product(range(1, 6), repeat=2)))
def test_assessment_preview_uses_the_canonical_matrix(client, owner, severity, likelihood):
    client.force_login(owner)
    response = client.get(
        reverse("v1:assessment-preview"), {"severity": severity, "likelihood": likelihood}
    )
    assert response.status_code == 200
    assert response.json()["risk_level"] == derive_risk_level(severity, likelihood)


def test_invalid_preview_never_defaults_to_a_low_risk(client, owner):
    client.force_login(owner)
    assert (
        client.get(
            reverse("v1:assessment-preview"), {"severity": "bad", "likelihood": 1}
        ).status_code
        == 400
    )


def test_options_use_the_canonical_scales_and_preview_requires_verification(client, owner):
    from safety_file.models import HAZARD_STATUSES
    from safety_file.risk import LIKELIHOOD_LABELS, SEVERITY_LABELS

    assert client.get(reverse("v1:hazard-options")).status_code == 403
    assert (
        client.get(reverse("v1:assessment-preview"), {"severity": 1, "likelihood": 1}).status_code
        == 403
    )
    client.force_login(owner)
    options = client.get(reverse("v1:hazard-options")).json()
    assert options["severity"] == [
        {"value": str(score), "label": f"{score} - {label}"}
        for score, label in SEVERITY_LABELS.items()
    ]
    assert options["likelihood"] == [
        {"value": str(score), "label": f"{score} - {label}"}
        for score, label in LIKELIHOOD_LABELS.items()
    ]
    assert options["statuses"] == list(HAZARD_STATUSES)
