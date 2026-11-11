"""Real document-pipeline proof and controlled HTML/resource boundaries."""

from __future__ import annotations

import json
import subprocess
from io import BytesIO

import pytest
from pypdf import PdfReader

from app.safetyfiles.pdf_contract import PDF_PAGES, PDFExportError
from app.safetyfiles.pdf_export import run_pdf_worker, safety_file_pdf
from app.safetyfiles.pdf_worker import article_html, built_path, deny_resources, document_html
from demo.build import build as build_demo
from safety_file import Author, git


def test_real_demo_build_preserves_all_hazards_mitigation_evidence_and_source_version(settings):
    """TH-001/007: exercise the shipped Zensical -> WeasyPrint pipeline."""
    repository = build_demo(settings.SAFETY_FILE_ROOT / "demo")
    # An invalid repository build config must not be read or executed by export.
    (repository.root / "mkdocs.yml").write_text("hooks: [does-not-exist.py]\n")
    git.commit_all(
        repository.root,
        "test: repository config must not run",
        Author("Fictional tester", "tester@example.org"),
    )
    head = repository.head_sha
    result = safety_file_pdf(repository, expected_head=head)
    assert result.cached is False
    assert result.path.stat().st_mode & 0o777 == 0o600
    reader = PdfReader(BytesIO(result.path.read_bytes()))
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert len(reader.pages) >= 7
    assert head in text.replace("\n", "")
    assert "DRAFT" in text
    assert "Controlled contents" in text
    for hazard in repository.hazards():
        assert hazard.id in text
    for mitigation in repository.mitigations():
        assert mitigation.id in text
    assert "Mitigation evidence and narratives" in text
    assert text.count("Implementation evidence") == 7
    assert head in str(reader.metadata.title)
    assert reader.trailer["/Root"]["/MarkInfo"]["/Marked"]
    assert repository.head_sha == head
    assert repository.is_clean
    assert safety_file_pdf(repository, expected_head=head).cached is True


@pytest.fixture
def site(tmp_path):
    for source, label in PDF_PAGES:
        path = tmp_path / built_path(source)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            f'<article class="md-content__inner"><h1 id="title">{label}</h1><p>Recorded evidence</p></article>'
        )
    return tmp_path


@pytest.mark.parametrize(
    "markup",
    [
        '<img src="https://untrusted.example.org/image.png">',
        '<img src="file:///etc/passwd">',
        "<style>p {display:none}</style>",
        "<script>ignored()</script>",
        '<p style="display:none">Hidden evidence</p>',
        '<iframe src="https://untrusted.example.org"></iframe>',
        '<a href="javascript:ignored()">Unsafe link</a>',
    ],
)
def test_unsupported_active_or_embedded_content_blocks_export(site, markup):
    (site / "index.html").write_text(f'<article class="md-content__inner">{markup}</article>')
    with pytest.raises(PDFExportError):
        article_html(site, "index.md", 0)


def test_missing_articles_and_pages_are_not_silently_skipped(site):
    (site / "index.html").write_text("<p>No article</p>")
    with pytest.raises(PDFExportError, match="no content article"):
        article_html(site, "index.md", 0)
    (site / "index.html").unlink()
    with pytest.raises(PDFExportError, match="missing"):
        article_html(site, "index.md", 0)


def test_links_are_references_not_uncontrolled_file_fetches(site):
    (site / "index.html").write_text(
        '<article class="md-content__inner"><h1 id="scope">Scope</h1><a href="#scope">Here</a><a href="assets/evidence.pdf">Evidence attachment</a><a href="https://digital.nhs.uk/">NHSE</a></article>'
    )
    output = article_html(site, "index.md", 0)
    assert 'id="page-0-scope"' in output
    assert 'href="#page-0-scope"' in output
    assert "not embedded" in output
    assert 'href="assets/' not in output
    assert 'href="https://digital.nhs.uk/"' in output
    with pytest.raises(PDFExportError):
        deny_resources("file:///etc/passwd")
    with pytest.raises(PDFExportError):
        deny_resources("https://untrusted.example.org/secret")


def test_appendices_include_recorded_narratives_without_interpreting_html(site):
    job = {
        "name": "Fictional deployment",
        "head": "a" * 40,
        "committed_at": "2026-11-11",
        "author_name": "Fictional tester",
        "author_email": "tester@example.org",
        "hazards": [
            {
                "id": "HAZ-001",
                "title": "Fictional hazard",
                "body": "<script>recorded as text</script>",
            }
        ],
        "mitigations": [
            {
                "id": "MIT-001",
                "title": "Fictional control",
                "owner": "tester@example.org",
                "status": "implemented",
                "control_type": "procedural",
                "created": "2026-11-11",
                "updated": "2026-11-11",
                "hazards": ["HAZ-001"],
                "evidence": "Fictional pilot report",
                "body": "Additional implementation detail",
            }
        ],
    }
    output = document_html(job, site)
    assert "<script>" not in output
    assert "&lt;script&gt;" in output
    assert "Fictional pilot report" in output
    assert "Additional implementation detail" in output
    assert "Attachments are references, not embedded" in output


def test_worker_receives_no_application_secrets_and_rejects_incomplete_output(
    tmp_path, monkeypatch
):
    def incomplete(command, **kwargs):
        assert set(kwargs["env"]) == {"PATH", "HOME", "LANG", "RAYON_NUM_THREADS"}
        assert kwargs["timeout"] == 90
        (tmp_path / "document.pdf").write_bytes(b"%PDF-incomplete")

    monkeypatch.setattr(subprocess, "run", incomplete)
    with pytest.raises(PDFExportError, match="complete PDF"):
        run_pdf_worker({}, tmp_path)


@pytest.mark.parametrize("kind", ["timeout", "controlled-failure", "unexpected-failure"])
def test_worker_failures_never_return_a_download(tmp_path, monkeypatch, kind):
    def fail(command, **kwargs):
        if kind == "timeout":
            raise subprocess.TimeoutExpired(command, kwargs["timeout"])
        raise subprocess.CalledProcessError(
            2 if kind == "controlled-failure" else 1,
            command,
            output=json.dumps({"detail": "Unsupported source content. No PDF was produced."}),
            stderr="Private build diagnostics must not reach the client.",
        )

    monkeypatch.setattr(subprocess, "run", fail)
    with pytest.raises(PDFExportError) as error:
        run_pdf_worker({}, tmp_path)
    assert "Private build diagnostics" not in str(error.value)
    assert "No" in str(error.value)
