"""Creating a new safety file from a template.

Templates are rendered once, at creation, and the result is committed as
ordinary Markdown. Turva does not keep templates live and re-render on read -
see `specifications/safety-file-layout.md`. A safety case is a historical
record, and a document whose wording changes because a template changed later is
not evidence of what was decided.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, StrictUndefined, TemplateError

from .errors import ValidationError
from .models import Manifest

#: Files rendered through Jinja2. Everything else is copied verbatim, so binary
#: assets and Markdown that happens to contain braces are left alone.
RENDERED_SUFFIXES = {".md", ".yml", ".yaml"}


def _environment() -> Environment:
    """Jinja2 configured to fail on anything undefined.

    `StrictUndefined` matters: a missing value in a safety document would
    otherwise render as an empty string, producing a plausible-looking document
    with a silently blank Clinical Safety Officer or intended-use statement.
    Better to refuse to create the file.
    """
    return Environment(
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        autoescape=False,  # noqa: S701 - rendering Markdown, not HTML
    )


def scaffold(
    *,
    root: Path,
    template_dir: Path,
    values: dict[str, Any],
    manifest: Manifest,
) -> None:
    """Copy `template_dir` into `root`, rendering templated files.

    The manifest is written from the `Manifest` object rather than rendered from
    the template, so its structure is owned by code that validates it.
    """
    template_dir = Path(template_dir)
    if not template_dir.is_dir():
        raise ValidationError(f"template directory {template_dir} does not exist")

    environment = _environment()

    for source in sorted(template_dir.rglob("*")):
        relative = source.relative_to(template_dir)

        # The manifest is written separately, below.
        if relative == Path(".turva") / "manifest.yaml":
            continue

        destination = root / relative
        if source.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)

        if source.suffix.lower() in RENDERED_SUFFIXES:
            try:
                rendered = environment.from_string(source.read_text(encoding="utf-8")).render(
                    **values
                )
            except TemplateError as exc:
                raise ValidationError(
                    f"could not render {relative}: {exc}. Every placeholder in a "
                    "template must be supplied; a blank safety document is worse "
                    "than a missing one."
                ) from exc
            destination.write_text(rendered, encoding="utf-8")
        else:
            shutil.copy2(source, destination)

    manifest_path = root / ".turva" / "manifest.yaml"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        yaml.dump(manifest.to_dict(), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )

    # Keep otherwise-empty directories in Git, so a fresh safety file has the
    # structure the layout specification describes rather than materialising
    # directories only once something is put in them.
    for directory in ("docs/assets", "docs/mitigations"):
        placeholder = root / directory / ".gitkeep"
        if placeholder.parent.is_dir() and not any(child for child in placeholder.parent.iterdir()):
            placeholder.write_text("", encoding="utf-8")
