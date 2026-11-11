"""Capture committed evidence, render out of process, atomically cache by source.

No rendering runs in a live safety-file working tree. Repository configuration,
plugins, hooks, remote resources and arbitrary pages are not build inputs.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from importlib.metadata import version
from pathlib import Path

from django.conf import settings

import safety_file
from app.safetyfiles.pdf_contract import PDF_PAGES, PDFExportError
from safety_file import SafetyFileRepository
from safety_file.errors import StaleVersionError
from safety_file.render import render_hazard_log


@dataclass(frozen=True)
class PDFDownload:
    path: Path
    source_commit: str
    cached: bool


def exporter_fingerprint() -> str:
    """Changes to code, CSS, scope or renderer versions invalidate old output."""
    source = Path(__file__).parent
    digest = hashlib.sha256()
    for name in ("pdf_contract.py", "pdf_export.py", "pdf_worker.py", "pdf-print.css"):
        digest.update((source / name).read_bytes())
    digest.update((source.parent / "requirements.txt").read_bytes())
    digest.update(sys.version.encode())
    for path in sorted(Path(safety_file.__file__).parent.glob("*.py")):
        digest.update(path.read_bytes())
    for package in ("zensical", "weasyprint", "beautifulsoup4"):
        digest.update(f"{package}={version(package)}".encode())
    return digest.hexdigest()[:20]


def complete_pdf(path: Path) -> bool:
    if not path.is_file() or not 100 <= path.stat().st_size <= 25 * 1024**2:
        return False
    with path.open("rb") as stream:
        if stream.read(5) != b"%PDF-":
            return False
        stream.seek(-16, os.SEEK_END)
        return stream.read().rstrip().endswith(b"%%EOF")


def run_pdf_worker(job: dict, directory: Path) -> Path:
    input_path = directory / "input.json"
    output_path = directory / "document.pdf"
    input_path.write_text(json.dumps(job), encoding="utf-8")
    try:
        subprocess.run(  # noqa: S603 - fixed Python module, server-generated paths
            [sys.executable, "-m", "app.safetyfiles.pdf_worker", str(input_path), str(output_path)],
            cwd=settings.BASE_DIR,
            # Do not forward database credentials, Django secrets or API keys to
            # the build process. It needs only Python imports and system fonts.
            env={
                "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
                "HOME": str(directory),
                "LANG": "C.UTF-8",
                "RAYON_NUM_THREADS": "2",
            },
            capture_output=True,
            text=True,
            check=True,
            timeout=90,
        )
    except subprocess.CalledProcessError as exc:
        # Only our controlled exception messages reach the API, never build
        # logs containing private source text or a Python traceback.
        if exc.returncode == 2:
            try:
                detail = json.loads(exc.stdout)["detail"]
            except ValueError, KeyError, TypeError:
                detail = "The PDF build failed. No download was produced."
            raise PDFExportError(detail) from None
        raise PDFExportError("The PDF build failed. No download was produced.") from None
    except subprocess.TimeoutExpired:
        raise PDFExportError(
            "The PDF build exceeded its time limit. No download was produced."
        ) from None
    if not complete_pdf(output_path):
        raise PDFExportError(
            "The renderer did not produce a complete PDF. No download is available."
        )
    return output_path


def safety_file_pdf(repository: SafetyFileRepository, *, expected_head: str) -> PDFDownload:
    """Return a PDF of the opened committed version, never a newer guessed state.

    The API authorises the visible index row before calling. All source data is
    captured under a clean-tree snapshot; the slow build then releases readers
    and writers and uses only that immutable capture. Competing cache misses
    can build independently; atomic replacement prevents partial downloads.
    """
    fingerprint = exporter_fingerprint()
    with repository.snapshot():
        head = repository.head_sha
        if head != expected_head:
            raise StaleVersionError(
                "This safety file changed after the page opened. Reload it before downloading the latest PDF."
            )
        manifest = repository.manifest
        if manifest.standard != "DCB0160" or manifest.template != "dcb0160-deployment":
            raise PDFExportError(
                "PDF export currently supports the DCB0160 deployment template only."
            )
        problems = repository.validate()
        if problems:
            raise PDFExportError(
                "This safety file does not validate. Resolve the recorded problems before exporting."
            )
        # The manifest UUID is validated by the index, but hash it as a path
        # component as well: repository metadata is not a trusted filename.
        identity = hashlib.sha256(manifest.project_id.encode()).hexdigest()
        cache = Path(settings.SAFETY_FILE_EXPORT_ROOT) / identity
        cache.mkdir(parents=True, exist_ok=True, mode=0o700)
        target = cache / f"{head}-{fingerprint}.pdf"
        if complete_pdf(target):
            return PDFDownload(target, head, True)
        commit = repository.history(limit=1)[0]
        hazards = repository.hazards()
        mitigations = repository.mitigations()
        pages = {path: repository.version_at(head, f"docs/{path}") for path, _ in PDF_PAGES}
        if (
            pages["hazards/index.md"].rstrip()
            != render_hazard_log(
                hazards=hazards, mitigations=mitigations, name=manifest.name
            ).rstrip()
        ):
            raise PDFExportError(
                "The committed hazard log does not match the current canonical assessments. Ask an administrator to inspect it and record a corrected version before exporting."
            )
        job = {
            "name": manifest.name,
            "head": head,
            "committed_at": commit.committed_at.isoformat(),
            "author_name": commit.author_name,
            "author_email": commit.author_email,
            "pages": pages,
            "hazards": [{**h.to_frontmatter(), "body": h.body} for h in hazards],
            "mitigations": [{**m.to_frontmatter(), "body": m.body} for m in mitigations],
        }
    with tempfile.TemporaryDirectory(prefix=".build-", dir=cache) as temporary:
        output = run_pdf_worker(job, Path(temporary))
        output.chmod(0o600)
        output.replace(target)
    return PDFDownload(target, head, False)
