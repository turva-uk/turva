"""TH-007: a download is private, complete and fixed to the source it cites."""

from __future__ import annotations

import pytest
from django.urls import reverse

from app.api.tests.test_hazard_writes import VALUES
from app.api.tests.test_safety_files import a_safety_file, make_user
from app.safetyfiles import pdf_export
from app.safetyfiles.models import Visibility
from app.safetyfiles.pdf_contract import PDF_PAGES, PDFExportError
from app.safetyfiles.services import save_hazard

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return make_user("cso@riverbank.example.nhs.uk")


@pytest.fixture
def file(owner):
    return a_safety_file(owner)


@pytest.fixture
def builds(monkeypatch):
    calls = []

    def build(job, directory):
        calls.append(job)
        path = directory / "document.pdf"
        path.write_bytes(
            b"%PDF-1.7\n" + job["head"].encode() + b"\n" + b"example " * 20 + b"\n%%EOF\n"
        )
        return path

    monkeypatch.setattr(pdf_export, "run_pdf_worker", build)
    return calls


def download(client, file, expected=None):
    return client.get(
        reverse("v1:safety-file-pdf", kwargs={"slug": file.slug}),
        {
            "expected_head": expected or file.repository().head_sha,
        },
    )


def body(response):
    # The test client's iterator closes the response with Django's connection
    # cleanup signal temporarily disconnected. Closing it again breaks the
    # outer pytest-django transaction rather than testing a download.
    return b"".join(response.streaming_content)


def test_download_cites_the_opened_version_and_cache_does_not_write_evidence(
    client, owner, file, builds
):
    client.force_login(owner)
    head = file.repository().head_sha
    response = download(client, file)
    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response["Cache-Control"] == "private, no-store"
    assert response["X-Turva-Source-Commit"] == head
    assert response["X-Turva-PDF-Cache"] == "miss"
    assert f"{file.slug}-{head[:8]}.pdf" in response["Content-Disposition"]
    first = body(response)
    cached = download(client, file)
    assert cached["X-Turva-PDF-Cache"] == "hit"
    assert body(cached) == first
    assert len(builds) == 1
    assert set(builds[0]["pages"]) == {path for path, _ in PDF_PAGES}
    assert file.repository().head_sha == head
    assert file.repository().is_clean


@pytest.mark.parametrize("identity", ["anonymous", "unverified", "private-reader", "public-reader"])
def test_permissions_are_checked_even_when_the_pdf_is_cached(client, owner, file, builds, identity):
    client.force_login(owner)
    body(download(client, file))
    client.logout()
    if identity == "public-reader":
        file.visibility = Visibility.PUBLIC
        file.save()
    if identity != "anonymous":
        reader = make_user("reader@riverbank.example.nhs.uk", verified=identity != "unverified")
        client.force_login(reader)
    response = download(client, file)
    assert (
        response.status_code
        == {"anonymous": 403, "unverified": 403, "private-reader": 404, "public-reader": 200}[
            identity
        ]
    )
    if response.status_code == 200:
        body(response)
    assert len(builds) == 1


def test_a_changed_file_cannot_be_returned_under_an_old_page_version(client, owner, file, builds):
    client.force_login(owner)
    old = file.repository().head_sha
    body(download(client, file))
    save_hazard(file, owner, VALUES, expected_head=old)
    assert download(client, file, old).status_code == 409
    latest = download(client, file)
    assert latest["X-Turva-Source-Commit"] != old
    body(latest)
    assert len(builds) == 2


def test_a_commit_during_render_keeps_the_original_captured_evidence(
    client, owner, file, builds, monkeypatch
):
    original = pdf_export.run_pdf_worker
    old = file.repository().head_sha

    def build_and_edit(job, directory):
        save_hazard(file, owner, VALUES, expected_head=old)
        return original(job, directory)

    monkeypatch.setattr(pdf_export, "run_pdf_worker", build_and_edit)
    client.force_login(owner)
    response = download(client, file, old)
    assert response["X-Turva-Source-Commit"] == old
    assert builds[0]["hazards"] == []
    assert old.encode() in body(response)
    assert file.repository().head_sha != old


def test_dirty_evidence_is_not_served_even_from_cache(client, owner, file, builds):
    client.force_login(owner)
    body(download(client, file))
    (file.repository_path / "docs/uncommitted.md").write_text("Uncommitted safety evidence.")
    assert download(client, file).status_code == 503
    assert len(builds) == 1


def test_incorrect_committed_generated_log_cannot_misstate_the_current_assessments(
    client, owner, file, builds
):
    """TH-008: neither a manual log edit nor an old generator may fake low risk."""
    from app.safetyfiles.services import author_for
    from safety_file import git

    (file.repository_path / "docs/hazards/index.md").write_text(
        "# Hazard log\n\nEverything is safe.\n"
    )
    git.commit_all(file.repository_path, "test: inconsistent generated log", author_for(owner))
    client.force_login(owner)
    response = download(client, file)
    assert response.status_code == 503
    assert "canonical assessments" in response.json()["detail"]
    assert not builds


def test_failed_build_does_not_leave_a_partial_cache_entry(
    client, owner, file, builds, monkeypatch, settings
):
    def fail(job, directory):
        (directory / "document.pdf").write_bytes(b"%PDF-partial")
        raise PDFExportError("A required built page is missing. No partial PDF was produced.")

    monkeypatch.setattr(pdf_export, "run_pdf_worker", fail)
    client.force_login(owner)
    head = file.repository().head_sha
    response = download(client, file)
    assert response.status_code == 503
    assert "No partial PDF" in response.json()["detail"]
    assert not list(settings.SAFETY_FILE_EXPORT_ROOT.rglob("*.pdf"))
    assert file.repository().head_sha == head
    assert file.repository().is_clean


def test_renderer_changes_and_truncated_cache_files_trigger_rebuilds(
    client, owner, file, builds, monkeypatch, settings
):
    client.force_login(owner)
    body(download(client, file))
    cached = next(settings.SAFETY_FILE_EXPORT_ROOT.rglob("*.pdf"))
    cached.write_bytes(b"%PDF-truncated")
    rebuilt = download(client, file)
    assert rebuilt["X-Turva-PDF-Cache"] == "miss"
    body(rebuilt)
    monkeypatch.setattr(pdf_export, "exporter_fingerprint", lambda: "another-renderer")
    updated = download(client, file)
    assert updated["X-Turva-PDF-Cache"] == "miss"
    body(updated)
    assert len(builds) == 3


def test_the_version_precondition_is_required_and_pdf_download_is_read_only(
    client, owner, file, builds
):
    client.force_login(owner)
    url = reverse("v1:safety-file-pdf", kwargs={"slug": file.slug})
    assert client.get(url).status_code == 400
    assert client.get(url, {"expected_head": "main"}).status_code == 400
    assert client.post(url, {}).status_code == 405
    assert not builds


def test_manufacturer_files_are_not_mislabelled_as_deployment_exports(client, owner, builds):
    file = a_safety_file(owner, standard="DCB0129")
    client.force_login(owner)
    response = download(client, file)
    assert response.status_code == 503
    assert "DCB0160" in response.json()["detail"]
    assert not builds
