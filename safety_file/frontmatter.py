"""Reading and writing Markdown files with YAML frontmatter.

Deliberately not using the `python-frontmatter` package. The round-trip
behaviour matters here more than convenience: these files are the audit trail,
so writing one back must not reorder keys, restyle block scalars, or reflow
text that a human wrote. Every spurious change is diff noise in a safety
record, and diff noise is what makes a history unreviewable.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .errors import FrontmatterError

DELIMITER = "---"


class _IndentedDumper(yaml.SafeDumper):
    """Dumper that indents list items under their key.

    PyYAML's default puts sequence items at the same indentation as the parent
    key, which is valid YAML but reads badly and differs from how a person
    writes it by hand. Since humans edit these files too, match the convention
    they would use.
    """

    def increase_indent(self, flow: bool = False, indentless: bool = False) -> None:
        super().increase_indent(flow=flow, indentless=False)


def _represent_str(dumper: yaml.SafeDumper, data: str) -> yaml.ScalarNode:
    """Emit multi-line strings as block scalars rather than escaped one-liners."""
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


_IndentedDumper.add_representer(str, _represent_str)


def parse(text: str) -> tuple[dict[str, Any], str]:
    """Split a Markdown document into its frontmatter mapping and body.

    Raises `FrontmatterError` if the document has no frontmatter block, rather
    than returning an empty mapping. A safety artefact without frontmatter is
    missing its identity and assessment, and treating that as "no metadata"
    would let an unreadable file look like an empty one.
    """
    if not text.startswith(DELIMITER):
        raise FrontmatterError(
            f"document does not begin with a {DELIMITER!r} frontmatter delimiter"
        )

    # Split on the closing delimiter at the start of a line.
    rest = text[len(DELIMITER) :].lstrip("\n")
    closing = f"\n{DELIMITER}"
    index = rest.find(closing)
    if index == -1:
        raise FrontmatterError("frontmatter block is not closed")

    raw_yaml = rest[:index]
    body = rest[index + len(closing) :]
    body = body.lstrip("\n")

    try:
        loaded = yaml.safe_load(raw_yaml)
    except yaml.YAMLError as exc:
        raise FrontmatterError(f"frontmatter is not valid YAML: {exc}") from exc

    if loaded is None:
        loaded = {}
    if not isinstance(loaded, dict):
        raise FrontmatterError(f"frontmatter must be a mapping, got {type(loaded).__name__}")

    return loaded, body


def serialise(metadata: dict[str, Any], body: str) -> str:
    """Render a frontmatter mapping and body back to a Markdown document.

    Key order is preserved as given, so callers control document layout and a
    rewrite does not reshuffle the file.
    """
    raw_yaml = yaml.dump(
        metadata,
        Dumper=_IndentedDumper,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=88,
    )
    body = body.strip("\n")
    return f"{DELIMITER}\n{raw_yaml}{DELIMITER}\n\n{body}\n"


def read(path: Path) -> tuple[dict[str, Any], str]:
    """Read and parse a Markdown file with frontmatter."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise FrontmatterError(f"{path} does not exist") from exc
    try:
        return parse(text)
    except FrontmatterError as exc:
        raise FrontmatterError(f"{path}: {exc}") from exc


def write(path: Path, metadata: dict[str, Any], body: str) -> None:
    """Write a Markdown file with frontmatter, creating parent directories."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(serialise(metadata, body), encoding="utf-8")
