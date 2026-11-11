"""Bounded Zensical/WeasyPrint worker. No Django settings or repository access.

Adaptation of the RCPCH rendered-article/print-CSS approach, not a generic HTML
renderer. See pdf-export-notice.md for upstream provenance and licence.
"""

from __future__ import annotations

import html
import json
import resource
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml
from bs4 import BeautifulSoup
from weasyprint import CSS, HTML

from app.safetyfiles.pdf_contract import PDF_PAGES, PDFExportError

# This proof deliberately supports textual safety evidence. External/local
# resource loading is denied, not silently replaced by a missing image.
SAFE_TAGS = {
    "a",
    "p",
    "div",
    "span",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "em",
    "b",
    "i",
    "s",
    "del",
    "br",
    "hr",
    "pre",
    "code",
    "blockquote",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "details",
    "summary",
    "sup",
    "sub",
    "dl",
    "dt",
    "dd",
    "abbr",
}
SAFE_ATTRIBUTES = {
    "id",
    "class",
    "href",
    "title",
    "colspan",
    "rowspan",
    "align",
    "open",
    "tabindex",
    "rel",
    "target",
}
SAFE_CLASSES = {
    "admonition",
    "admonition-title",
    "note",
    "info",
    "warning",
    "danger",
    "success",
    "tip",
    "caution",
    "attention",
    "important",
    "highlight",
    "language-text",
    "language-python",
    "md-typeset__scrollwrap",
    "md-typeset__table",
}


def built_path(source: str) -> str:
    path = Path(source)
    return (
        (path.parent / "index.html").as_posix()
        if path.name == "index.md"
        else (path.with_suffix("") / "index.html").as_posix()
    )


def article_html(site: Path, source: str, index: int) -> str:
    path = site / built_path(source)
    if not path.is_file():
        raise PDFExportError("A required built page is missing. No partial PDF was produced.")
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    article = soup.find("article", class_="md-content__inner")
    if article is None:
        raise PDFExportError("A required page has no content article. No partial PDF was produced.")
    for control in article.select("a.headerlink, a.md-content__button"):
        control.decompose()
    for tag in article.find_all(True):
        if tag.name not in SAFE_TAGS or set(tag.attrs) - SAFE_ATTRIBUTES:
            raise PDFExportError(
                f"The page docs/{source} contains unsupported HTML ({tag.name}; attributes: {', '.join(sorted(set(tag.attrs) - SAFE_ATTRIBUTES)) or 'none'}). The PDF proof supports text, tables and ordinary links only; no partial download was produced."
            )
        # Only trusted print classes can affect layout. Unrecognised classes
        # are formatting, not evidence; their text remains in the document.
        if "class" in tag.attrs:
            tag["class"] = [item for item in tag["class"] if item in SAFE_CLASSES]
        if tag.name == "details":
            tag["open"] = ""
        if "id" in tag.attrs:
            tag["id"] = f"page-{index}-{tag['id']}"
        if tag.name == "a" and "href" in tag.attrs:
            # WeasyPrint recognises rel=attachment as an instruction to fetch
            # and embed a file. Links in this proof are references only.
            tag.attrs.pop("rel", None)
            href = str(tag["href"])
            parsed = urlsplit(href)
            if parsed.scheme and parsed.scheme not in {"http", "https", "mailto"}:
                raise PDFExportError(
                    "A source link uses an unsupported URL scheme. No PDF was produced."
                )
            if href.startswith("#"):
                tag["href"] = f"#page-{index}-{unquote(href[1:])}"
            elif not parsed.scheme:
                # Relative document/attachment links are source references,
                # not file:// links into a temporary build directory.
                tag.attrs.pop("href")
                tag.append(f" [source reference: {href}; not embedded]")
    return article.decode_contents()


def recorded(value: str) -> str:
    return f'<pre class="recorded">{html.escape(value or "Not recorded.")}</pre>'


def appendices(job: dict) -> str:
    sections = ['<section class="page"><h1>Additional hazard narratives</h1>']
    sections.append(
        "<p>Recorded Markdown text, not interpreted HTML. Structured assessments are in the hazard log.</p>"
    )
    if not job["hazards"]:
        sections.append("<p>No hazards recorded. This is not evidence of safety.</p>")
    for hazard in job["hazards"]:
        sections.append(f"<h2>{html.escape(hazard['id'])}: {html.escape(hazard['title'])}</h2>")
        sections.append(recorded(hazard["body"]))
    sections.append('</section><section class="page"><h1>Mitigation evidence and narratives</h1>')
    if not job["mitigations"]:
        sections.append("<p>No mitigations recorded.</p>")
    for mitigation in job["mitigations"]:
        sections.append(
            f"<h2>{html.escape(mitigation['id'])}: {html.escape(mitigation['title'])}</h2>"
        )
        fields = ("status", "control_type", "owner", "created", "updated")
        sections.extend(
            f"<p><strong>{field.replace('_', ' ').capitalize()}:</strong> {html.escape(str(mitigation[field]))}</p>"
            for field in fields
        )
        sections.append(
            f"<p><strong>Hazards:</strong> {html.escape(', '.join(mitigation.get('hazards', [])) or 'None recorded')}</p>"
        )
        sections.append(
            "<h3>Implementation evidence</h3>" + recorded(mitigation.get("evidence", ""))
        )
        sections.append("<h3>Recorded narrative (Markdown)</h3>" + recorded(mitigation["body"]))
    return "".join(sections) + "</section>"


def document_html(job: dict, site: Path) -> str:
    name = html.escape(job["name"])
    scope = "".join(f"<li>{label} (docs/{path})</li>" for path, label in PDF_PAGES)
    cover = (
        f'<section class="cover"><p class="brand">Turva</p><h1>{name}</h1>'
        "<h2>DCB0160 clinical safety management file</h2>"
        '<p class="warning">DRAFT - not approval to deploy. Pre-release export for review.</p>'
        f'<p>Source version:</p><p class="commit">{html.escape(job["head"])}</p>'
        f"<p>Committed {html.escape(job['committed_at'])}</p>"
        f"<p>By {html.escape(job['author_name'])} &lt;{html.escape(job['author_email'])}&gt;</p>"
        "<p>This copy is fixed to that version, not a live view. Turva does not certify safety or regulatory compliance.</p>"
        f"<h3>Controlled contents</h3><ol>{scope}<li>Additional narratives for all recorded hazards</li><li>Evidence and narratives for all recorded mitigations</li></ol>"
        "<p>Attachments are references, not embedded. Embedded media/active HTML is unsupported and blocks export. Additional repository pages are outside this controlled text scope.</p></section>"
    )
    pages = "".join(
        f'<section class="page" id="source-{index}">{article_html(site, source, index)}</section>'
        for index, (source, _) in enumerate(PDF_PAGES)
    )
    return f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>{name} - source {html.escape(job["head"])}</title></head><body>{cover}{pages}{appendices(job)}</body></html>'


def deny_resources(url, *args, **kwargs):
    raise PDFExportError("PDF resources cannot be fetched from the network or local filesystem.")


def build(job: dict, directory: Path, output: Path) -> None:
    docs = directory / "docs"
    docs.mkdir()
    for source, _ in PDF_PAGES:
        path = docs / source
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(job["pages"][source], encoding="utf-8")
    config = {
        "site_name": job["name"],
        "docs_dir": "docs",
        "site_dir": "site",
        "theme": {"variant": "classic", "font": False},
        "plugins": [],
        "nav": [{label: path} for path, label in PDF_PAGES],
        "markdown_extensions": ["admonition", "pymdownx.details", "pymdownx.superfences", "tables"],
    }
    config_path = directory / "mkdocs.yml"
    config_path.write_text(yaml.safe_dump(config), encoding="utf-8")
    try:
        subprocess.run(  # noqa: S603 - trusted config, fixed command, captured output
            [sys.executable, "-m", "zensical", "build", "--config-file", str(config_path)],
            cwd=directory,
            check=True,
            capture_output=True,
            timeout=30,
        )
    except subprocess.CalledProcessError, subprocess.TimeoutExpired:
        raise PDFExportError(
            "The documentation build failed or timed out. No PDF was produced."
        ) from None
    document = document_html(job, directory / "site")
    css = Path(__file__).with_name("pdf-print.css").read_text(encoding="utf-8")
    blocked = False

    def reject_fetch(url, *args, **kwargs):
        nonlocal blocked
        blocked = True
        return deny_resources(url, *args, **kwargs)

    HTML(string=document, url_fetcher=reject_fetch).write_pdf(
        output, stylesheets=[CSS(string=css, url_fetcher=reject_fetch)], pdf_tags=True
    )
    # WeasyPrint can log a failed fetch and continue. A blocked resource must
    # not become an apparently complete download missing evidence.
    if blocked:
        raise PDFExportError(
            "A resource could not be included safely. No partial PDF was produced."
        )


def main() -> None:
    # Native rendering and layout are not allowed to occupy an unbounded web
    # worker. The parent also imposes a 90-second wall-clock limit. This is
    # resource containment, not a general-purpose untrusted-code sandbox.
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3, 2 * 1024**3))
    input_path, output = map(Path, sys.argv[1:])
    try:
        build(json.loads(input_path.read_text(encoding="utf-8")), input_path.parent, output)
    except PDFExportError as exc:
        print(json.dumps({"detail": str(exc)}))
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
