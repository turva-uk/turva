"""Read-only viewing of the controlled safety documents (R10).

Only the four documents in the controlled PDF scope can be read, by a fixed
key, never by a caller-supplied path. Each is read from the committed Git object
at the snapshot's HEAD, so the view cites exactly the version it shows.

Markdown is converted to HTML here and then into an **allowlisted tree of
typed nodes**; the browser builds React elements from that tree and never
inserts source as HTML. Nothing in a document can execute, load a resource,
or style the page. Images, embedded or active HTML and unsupported link schemes
become visible placeholders rather than silently disappearing. If formatting
cannot be represented without changing meaning, the formatted view is refused
and the bounded committed source is returned for display as escaped text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from posixpath import normpath
from urllib.parse import unquote, urlsplit

import markdown
from bs4 import BeautifulSoup, Comment, NavigableString, Tag
from markdown.extensions import Extension
from markdown.treeprocessors import Treeprocessor

from app.safetyfiles.pdf_contract import PDF_PAGES
from safety_file import SafetyFileRepository
from safety_file.errors import UnreadableSourceError
from safety_file.render import render_hazard_log

#: Committed sources above this size are refused whole, never truncated.
MAX_SOURCE_BYTES = 512 * 1024
#: Bounds on the response a single document can produce.
MAX_NODES = 20_000
MAX_DEPTH = 40
#: Limit reference expansion before HTML serialisation, not just after parsing.
MAX_RENDERED_CHARACTERS = 2 * 1024 * 1024


@dataclass(frozen=True)
class SafetyDocument:
    key: str
    title: str
    path: str  # relative to docs/


_KEYS = {
    "index.md": "overview",
    "clinical-risk-management-plan.md": "risk-management-plan",
    "hazards/index.md": "hazard-log",
    "clinical-safety-case-report.md": "safety-case-report",
}

#: The same controlled scope as the PDF download. Adding a page to a file's
#: mkdocs.yml does not make it readable here.
DOCUMENTS = tuple(SafetyDocument(_KEYS[path], title, path) for path, title in PDF_PAGES)
BY_KEY = {document.key: document for document in DOCUMENTS}
BY_PATH = {document.path: document for document in DOCUMENTS}

UNAVAILABLE_MESSAGES = {
    "missing": "This document is not present in the committed version of the safety file.",
    "not-a-file": "This document is committed as a link or other non-file entry, which Turva does not follow.",
    "too-large": "This document is larger than Turva will display. Nothing from it is shown.",
    "not-text": "This document is not readable UTF-8 text. Nothing from it is shown.",
    "too-complex": "This document is too large or deeply nested to display safely. Nothing from it is shown.",
    "unsupported-formatting": (
        "Turva cannot faithfully display this document's formatting. "
        "No formatted interpretation is shown. The committed Markdown source below is read-only text, "
        "not rendered HTML; review its markup before relying on the content."
    ),
    "hazard-log-out-of-date": (
        "The committed hazard log does not match the recorded hazard assessments, so it is not shown. "
        "The individual hazards are the authoritative record. Ask an administrator to inspect the repository."
    ),
}

MARKDOWN_EXTENSIONS = [
    "admonition",
    "pymdownx.details",
    "pymdownx.superfences",
    "pymdownx.highlight",
    "tables",
    "toc",
]

#: Elements mapped to themselves (or a canonical equivalent) in the tree.
ELEMENTS = {
    **{f"h{level}": f"h{level}" for level in range(1, 7)},
    **{
        tag: tag
        for tag in (
            "p",
            "ul",
            "ol",
            "li",
            "blockquote",
            "pre",
            "code",
            "hr",
            "br",
            "strong",
            "em",
            "del",
            "sup",
            "sub",
            "dl",
            "dt",
            "dd",
            "table",
            "thead",
            "tbody",
            "tfoot",
            "tr",
            "th",
            "td",
            "caption",
        )
    },
    # A neutral block, so text from raw HTML keeps its own paragraph. No
    # attribute, class or style is carried across.
    "div": "div",
    "b": "strong",
    "i": "em",
    "s": "del",
    "strike": "del",
}

#: Embedded, active or interactive content. Shown as a placeholder, with its
#: contents dropped: none of it is text a reader could rely on as written.
UNSUPPORTED = {
    "img": "An image",
    "picture": "An image",
    "svg": "An embedded drawing",
    "math": "Embedded mathematics",
    "video": "A video",
    "audio": "An audio clip",
    "iframe": "An embedded page",
    "frame": "An embedded page",
    "frameset": "An embedded page",
    "object": "Embedded content",
    "embed": "Embedded content",
    "applet": "Embedded content",
    "canvas": "Embedded content",
    "script": "A script",
    "noscript": "Script fallback content",
    "template": "Template content",
    "style": "A stylesheet",
    "link": "A linked resource",
    "meta": "Page metadata",
    "base": "Page metadata",
    "form": "A form",
    "input": "A form control",
    "button": "A form control",
    "select": "A form control",
    "textarea": "A form control",
    "dialog": "Interactive content",
}

ADMONITION_KINDS = {
    "note",
    "abstract",
    "info",
    "tip",
    "success",
    "question",
    "warning",
    "failure",
    "danger",
    "bug",
    "example",
    "quote",
}


#: Containers whose whitespace-only text is layout, not content.
STRUCTURAL = {
    "[document]",
    "ul",
    "ol",
    "dl",
    "blockquote",
    "details",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
}


class _TooComplex(Exception):
    pass


class _UnrepresentedFormatting(Exception):
    """A formatted rendition would silently drop a potentially meaningful detail."""


class _BoundedTree(Treeprocessor):
    def run(self, root):
        # Markdown references can repeat a long address many times from a small
        # source. Count shared attribute strings before the serializer copies
        # them into one potentially enormous HTML string.
        characters = 0
        for element in root.iter():
            characters += len(element.text or "") + len(element.tail or "")
            characters += sum(len(value) for value in element.attrib.values())
            if characters > MAX_RENDERED_CHARACTERS:
                raise _TooComplex


class _BoundedMarkdown(Extension):
    def extendMarkdown(self, md):
        md.treeprocessors.register(_BoundedTree(md), "turva-output-bound", -100)


def _only_attributes(tag: Tag, allowed: set[str]) -> None:
    if set(tag.attrs) - allowed:
        raise _UnrepresentedFormatting


def _bounded_integer(value, maximum: int) -> int | None:
    """Only short ASCII decimal attributes, before attempting integer conversion."""
    if (
        not isinstance(value, str)
        or not value.isascii()
        or not value.isdecimal()
        or len(value) > len(str(maximum))
    ):
        return None
    number = int(value)
    return number if 0 < number <= maximum else None


class _Converter:
    def __init__(self, source_path: str) -> None:
        self.source_path = source_path
        self.nodes = 0
        self.unsupported = 0
        self.anchors: set[str] = set()

    def count(self, depth: int) -> None:
        self.nodes += 1
        if self.nodes > MAX_NODES or depth > MAX_DEPTH:
            raise _TooComplex

    def children(self, tag: Tag, depth: int) -> list[dict]:
        # Layout whitespace between blocks and table rows is not content.
        structural = tag.name in STRUCTURAL or (
            tag.name == "div" and "admonition" in (tag.get("class") or [])
        )
        nodes: list[dict] = []
        for child in tag.children:
            if structural and type(child) is NavigableString and not child.strip():
                continue
            nodes.extend(self.node(child, depth + 1))
        return nodes

    def placeholder(self, description: str, depth: int) -> list[dict]:
        self.count(depth)
        self.unsupported += 1
        return [{"type": "unsupported", "description": description}]

    def node(self, child, depth: int) -> list[dict]:
        if isinstance(child, Comment):
            # Comments are not displayed by the documentation site either; the
            # generated hazard log's banner is one.
            return []
        if isinstance(child, NavigableString):
            # CDATA, declarations and processing instructions are not ordinary
            # displayed prose. BeautifulSoup stringifies them as if they were.
            if type(child) is not NavigableString:
                raise _UnrepresentedFormatting
            text = str(child)
            if not text:
                return []
            self.count(depth)
            return [{"type": "text", "text": text}]
        if not isinstance(child, Tag):
            raise _UnrepresentedFormatting

        name = child.name.lower()
        if name in UNSUPPORTED:
            description = UNSUPPORTED[name]
            alt = child.get("alt") if name == "img" else None
            if isinstance(alt, str) and alt.strip():
                description = f"{description} ({alt.strip()})"
            return self.placeholder(f"{description} is not displayed in Turva.", depth)

        self.count(depth)
        classes = child.get("class") or []

        if name == "div" and "admonition" in classes:
            return [self.admonition(child, classes, depth, collapsible=False)]
        if name == "details":
            return [self.admonition(child, classes, depth, collapsible=True)]
        if name == "a":
            _only_attributes(child, {"href"})
            return self.link(child, depth)
        if name in ELEMENTS:
            node: dict = {"type": "element", "tag": ELEMENTS[name]}
            attrs = self.attributes(name, child)
            if attrs:
                node["attrs"] = attrs
            if name not in {"hr", "br"}:
                node["children"] = self.children(child, depth)
            return [node]
        if name == "span":
            _only_attributes(child, set())
            return self.children(child, depth)
        # Flattening an unknown tag or dropping CSS can turn a deleted approval
        # into ordinary approval text. Preserve the whole source instead (TH-001).
        raise _UnrepresentedFormatting

    def attributes(self, name: str, tag: Tag) -> dict:
        attrs: dict = {}
        allowed: set[str] = set()
        if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            allowed.add("id")
            if "id" in tag.attrs:
                identifier = tag.get("id")
                if not isinstance(identifier, str) or identifier in self.anchors:
                    raise _UnrepresentedFormatting
                self.anchors.add(identifier)
                attrs["id"] = identifier
        if name == "ol":
            allowed.add("start")
            if "start" in tag.attrs:
                start = _bounded_integer(tag.get("start"), 99_999)
                if start is None:
                    raise _UnrepresentedFormatting
                attrs["start"] = start
        if name in {"th", "td"}:
            allowed.update({"colspan", "rowspan", "align", "style"})
            for span in ("colspan", "rowspan"):
                if span in tag.attrs:
                    value = _bounded_integer(tag.get(span), 100)
                    if value is None:
                        raise _UnrepresentedFormatting
                    attrs[span] = value
            if "align" in tag.attrs:
                align = tag.get("align")
                if align not in {"left", "center", "right"}:
                    raise _UnrepresentedFormatting
                attrs["align"] = align
            if "style" in tag.attrs:
                # Accept a complete alignment declaration, never a substring
                # beside hiding, deletion or other unrepresented CSS.
                alignment = re.fullmatch(
                    r"\s*text-align\s*:\s*(left|center|right)\s*;?\s*",
                    str(tag["style"]),
                    re.IGNORECASE,
                )
                if alignment is None:
                    raise _UnrepresentedFormatting
                attrs["align"] = alignment[1].lower()
        classes = tag.get("class") or []
        if (name == "pre" and classes == ["highlight"]) or (
            name == "code" and len(classes) == 1 and re.fullmatch(r"language-[\w.+-]+", classes[0])
        ):
            # Known Markdown code wrappers: no source CSS is imported. Syntax
            # highlighting is disabled so arbitrary Pygments spans are absent.
            allowed.add("class")
        _only_attributes(tag, allowed)
        return attrs

    def admonition(self, tag: Tag, classes, depth: int, *, collapsible: bool) -> dict:
        allowed_classes = ADMONITION_KINDS | ({"admonition"} if not collapsible else set())
        if set(classes) - allowed_classes or len(set(classes) & ADMONITION_KINDS) > 1:
            raise _UnrepresentedFormatting
        _only_attributes(tag, {"class", "open"} if collapsible else {"class"})
        kind = next((item for item in classes if item in ADMONITION_KINDS), "note")
        title_tag = (
            tag.find("summary", recursive=False)
            if collapsible
            else tag.find("p", class_="admonition-title", recursive=False)
        )
        title = title_tag.get_text(" ", strip=True) if title_tag else ""
        title = title or kind.capitalize()
        # Titles are evidence too. Do not flatten them before checking for
        # unsupported images, active content and links through the same boundary.
        title_nodes = self.children(title_tag, depth) if title_tag is not None else []
        if title_tag is not None:
            _only_attributes(title_tag, set() if collapsible else {"class"})
            if not collapsible and title_tag.get("class") != ["admonition-title"]:
                raise _UnrepresentedFormatting
            title_tag.extract()
        return {
            "type": "admonition",
            "kind": kind,
            "title": title,
            "title_nodes": title_nodes,
            "collapsible": collapsible,
            "open": collapsible and "open" in tag.attrs,
            "children": self.children(tag, depth),
        }

    def link(self, tag: Tag, depth: int) -> list[dict]:
        children = self.children(tag, depth)
        href = tag.get("href")
        if not isinstance(href, str) or not href.strip():
            return children
        href = href.strip()
        try:
            parsed = urlsplit(href)
        except ValueError:
            # Invalid bracketed hosts and Unicode authority characters are
            # untrusted addresses, not reasons to fail the entire evidence read.
            return self.unsupported_link(children)
        if href.startswith("#"):
            return [{"type": "anchor", "fragment": unquote(href[1:]), "children": children}]
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return [{"type": "external", "href": href, "children": children}]
        if parsed.scheme == "mailto":
            return [{"type": "external", "href": href, "children": children}]
        if parsed.scheme or parsed.netloc:
            return self.unsupported_link(children)
        if parsed.query:
            # A query can identify a different evidence version. Do not turn
            # that address into an unqualified link to the current document.
            self.unsupported += 1
            return [
                *children,
                {"type": "reference", "text": f"source reference: {href}; not followed"},
            ]
        target = self.resolve(unquote(parsed.path))
        if target is not None:
            node = {"type": "document", "document": target.key, "children": children}
            if parsed.fragment:
                node["fragment"] = unquote(parsed.fragment)
            return [node]
        # A page or attachment outside the controlled scope: a reference to
        # the source, not a link into the repository or a build directory.
        return [*children, {"type": "reference", "text": f"source reference: {href}"}]

    def unsupported_link(self, children: list[dict]) -> list[dict]:
        self.unsupported += 1
        return [
            *children,
            {"type": "reference", "text": "link with an unsupported address, not followed"},
        ]

    def resolve(self, path: str) -> SafetyDocument | None:
        if not path:
            return BY_PATH.get(self.source_path)
        base = self.source_path.rpartition("/")[0]
        joined = normpath(f"{base}/{path}" if base else path)
        if joined.startswith("../") or joined == "..":
            return None
        if joined.endswith("/"):
            joined = f"{joined}index.md"
        return BY_PATH.get(joined) or BY_PATH.get(f"{joined}/index.md")


def render_document(source: str, source_path: str) -> dict:
    """Markdown to an allowlisted node tree, with a count of what is not shown."""
    html = markdown.markdown(
        source,
        extensions=[*MARKDOWN_EXTENSIONS, _BoundedMarkdown()],
        extension_configs={"pymdownx.highlight": {"use_pygments": False}},
        output_format="html",
    )
    if len(html) > MAX_RENDERED_CHARACTERS:
        raise _TooComplex
    converter = _Converter(source_path)
    soup = BeautifulSoup(html, "html.parser")
    return {"blocks": converter.children(soup, -1), "unsupported": converter.unsupported}


def read_document(repository: SafetyFileRepository, document: SafetyDocument) -> dict:
    """Read one controlled document at HEAD. Call under `repository.snapshot()`.

    Returns `available: False` with an honest reason rather than raising for a
    document that is absent or cannot be shown; unexpected storage failures
    still raise to the caller's error boundary.
    """
    head = repository.head_sha
    path = f"docs/{document.path}"
    last = repository.history(path, limit=1)
    payload = {
        "key": document.key,
        "title": document.title,
        "path": path,
        "source_commit": head,
        "last_changed": last[0] if last else None,
    }
    try:
        source = repository.committed_text(head, path, max_bytes=MAX_SOURCE_BYTES)
    except UnreadableSourceError as exc:
        return payload | unavailable(exc.reason)

    if document.key == "hazard-log":
        canonical = render_hazard_log(
            hazards=repository.hazards(),
            mitigations=repository.mitigations(),
            name=repository.manifest.name,
        )
        if source.rstrip() != canonical.rstrip():
            return payload | unavailable("hazard-log-out-of-date")

    try:
        rendered = render_document(source, document.path)
    except _UnrepresentedFormatting:
        # Source has already passed the committed-file, UTF-8 and byte bounds,
        # plus canonical hazard-log verification. It is never executed as HTML.
        return payload | unavailable("unsupported-formatting") | {"source": source}
    except _TooComplex, RecursionError:
        return payload | unavailable("too-complex")
    return payload | {"available": True, **rendered}


def unavailable(reason: str) -> dict:
    return {
        "available": False,
        "reason": reason,
        "message": UNAVAILABLE_MESSAGES[reason],
        "blocks": [],
        "unsupported": 0,
    }
