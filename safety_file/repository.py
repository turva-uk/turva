"""`SafetyFileRepository` - the storage layer for one Clinical Safety Management File.

This is the only place that touches a safety file's working tree. Everything
above it - Django views, the CLI, the AI assistant - goes through this class, so
that the invariants hold no matter who is calling:

- every write is validated before it reaches disk
- every write is committed, attributed to the person who caused it
- the generated hazard log is regenerated whenever a hazard changes
- identifiers are allocated sequentially and never reused

No framework imports. See ADR 0001.
"""

from __future__ import annotations

import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from . import frontmatter, git
from .errors import (
    NotASafetyFileError,
    SchemaVersionError,
    ValidationError,
)
from .git import Author, Commit
from .models import Hazard, Manifest, Mitigation
from .render import render_hazard_log

MANIFEST_PATH = Path(".turva") / "manifest.yaml"
DOCS_DIR = Path("docs")
HAZARDS_DIR = DOCS_DIR / "hazards"
MITIGATIONS_DIR = DOCS_DIR / "mitigations"
HAZARD_LOG_PATH = HAZARDS_DIR / "index.md"

_SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def slugify(text: str, *, max_length: int = 50) -> str:
    """Turn a title into a filename-safe slug.

    Used for the human-readable part of a filename only. The identifier in the
    frontmatter is authoritative, so a slug changing when a title is corrected
    does not change the artefact's identity.
    """
    normalised = unicodedata.normalize("NFKD", text)
    ascii_text = normalised.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_STRIP.sub("-", ascii_text).strip("-")
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug or "untitled"


@dataclass(frozen=True)
class ArtefactFile:
    """An artefact and the repository-relative path it lives at."""

    path: str
    artefact: Hazard | Mitigation


class SafetyFileRepository:
    """A safety file on disk, backed by Git."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        if not git.is_repository(self.root):
            raise NotASafetyFileError(f"{self.root} is not a Git repository")
        if not (self.root / MANIFEST_PATH).is_file():
            raise NotASafetyFileError(
                f"{self.root} has no {MANIFEST_PATH}; it is a Git repository but "
                "not a Turva safety file"
            )
        self._check_schema_version()

    # ---------------------------------------------------------------- creation

    @classmethod
    def create(
        cls,
        root: Path,
        *,
        name: str,
        standard: str,
        template_dir: Path,
        values: dict[str, Any],
        author: Author,
        project_id: str | None = None,
        created: date | None = None,
    ) -> SafetyFileRepository:
        """Scaffold a new safety file from a template and make the first commit.

        Imported lazily to keep the module graph acyclic: scaffolding needs the
        repository, and the repository offers scaffolding as a constructor.
        """
        from .scaffold import scaffold

        root = Path(root)
        if root.exists() and any(root.iterdir()):
            raise ValidationError(f"{root} already exists and is not empty")

        created = created or date.today()
        project_id = project_id or str(uuid.uuid4())

        git.init(root)
        scaffold(
            root=root,
            template_dir=template_dir,
            values={
                **values,
                "name": name,
                "project_id": project_id,
                "created": created.isoformat(),
            },
            manifest=Manifest(
                schema_version=Manifest.CURRENT_SCHEMA_VERSION,
                project_id=project_id,
                name=name,
                standard=standard,
                template=template_dir.name,
                template_version=1,
                created=created,
            ),
        )
        # Scaffolding has written the manifest and git.init has run, so the
        # directory is already a valid safety file and can be opened normally.
        repository = cls(root)

        # Generate the hazard log before the first commit, rather than
        # committing the template's hand-written placeholder and replacing it
        # the first time a hazard is saved. One producer for this file means it
        # cannot drift from what `render_hazard_log` would say, and a brand new
        # safety file carries the same "an empty hazard log is not evidence of a
        # safe system" wording as one whose hazards have all been closed.
        repository._write_hazard_log()

        git.commit_all(
            root,
            f"feat: create safety file for {name}",
            author=author,
        )
        return repository

    # ---------------------------------------------------------------- manifest

    def _check_schema_version(self) -> None:
        version = self.manifest.schema_version
        if version > Manifest.CURRENT_SCHEMA_VERSION:
            raise SchemaVersionError(
                f"{self.root} uses schema version {version}, but this version of "
                f"Turva understands up to {Manifest.CURRENT_SCHEMA_VERSION}. "
                "Upgrade Turva rather than opening this file with an older version, "
                "which could silently drop fields it does not recognise."
            )

    @property
    def manifest(self) -> Manifest:
        raw = (self.root / MANIFEST_PATH).read_text(encoding="utf-8")
        return Manifest.from_dict(yaml.safe_load(raw))

    # ----------------------------------------------------------------- reading

    def _artefact_paths(self, directory: Path, prefix: str) -> list[Path]:
        absolute = self.root / directory
        if not absolute.is_dir():
            return []
        return sorted(path for path in absolute.glob(f"{prefix}-*.md") if path.name != "index.md")

    def hazards(self) -> list[Hazard]:
        """Every hazard, ordered by identifier."""
        hazards = []
        for path in self._artefact_paths(HAZARDS_DIR, "HAZ"):
            metadata, body = frontmatter.read(path)
            hazard = Hazard.from_frontmatter(metadata, body)
            self._check_id_matches_filename(hazard.id, path)
            hazards.append(hazard)
        return sorted(hazards, key=lambda hazard: hazard.id)

    def mitigations(self) -> list[Mitigation]:
        """Every mitigation, ordered by identifier."""
        mitigations = []
        for path in self._artefact_paths(MITIGATIONS_DIR, "MIT"):
            metadata, body = frontmatter.read(path)
            mitigation = Mitigation.from_frontmatter(metadata, body)
            self._check_id_matches_filename(mitigation.id, path)
            mitigations.append(mitigation)
        return sorted(mitigations, key=lambda mitigation: mitigation.id)

    def hazard(self, hazard_id: str) -> Hazard:
        for hazard in self.hazards():
            if hazard.id == hazard_id:
                return hazard
        raise ValidationError(f"{hazard_id} not found in {self.root}")

    def mitigation(self, mitigation_id: str) -> Mitigation:
        for mitigation in self.mitigations():
            if mitigation.id == mitigation_id:
                return mitigation
        raise ValidationError(f"{mitigation_id} not found in {self.root}")

    @staticmethod
    def _check_id_matches_filename(identifier: str, path: Path) -> None:
        """Layout rule 3.

        A mismatch means someone renamed a file without updating its
        frontmatter, or vice versa. Either way the artefact now has two
        identities and the history of one of them is broken.
        """
        if not path.name.startswith(f"{identifier}-") and path.stem != identifier:
            raise ValidationError(
                f"{path.name} contains id {identifier!r}, which does not match its "
                "filename. The frontmatter id is authoritative; rename the file to "
                f"{identifier}-<slug>.md"
            )

    # ---------------------------------------------------------- identity rules

    def next_hazard_id(self) -> str:
        return self._next_id(HAZARDS_DIR, "HAZ")

    def next_mitigation_id(self) -> str:
        return self._next_id(MITIGATIONS_DIR, "MIT")

    def _next_id(self, directory: Path, prefix: str) -> str:
        """Allocate the next sequential identifier.

        Based on the highest identifier *ever allocated*, which is not the same
        as the highest currently on disk. Git history is consulted as well as
        the working tree, so an identifier whose file was deleted out of band is
        still never handed out again.

        Reuse would be a serious fault rather than a cosmetic one: `git log` for
        the new file would return the deleted hazard's history, silently
        attaching one safety decision's audit trail to a different hazard.
        """
        pattern = re.compile(rf"{prefix}-(\d{{3}})")

        numbers = {
            int(match.group(1))
            for path in self._artefact_paths(directory, prefix)
            if (match := pattern.search(path.name))
        }
        numbers |= {
            int(match.group(1))
            for historical in git.paths_ever_added(self.root, f"{directory}/{prefix}-*.md")
            if (match := pattern.search(Path(historical).name))
        }

        highest = max(numbers, default=0)
        return f"{prefix}-{highest + 1:03d}"

    def path_for(self, artefact: Hazard | Mitigation) -> str:
        directory = HAZARDS_DIR if isinstance(artefact, Hazard) else MITIGATIONS_DIR
        return str(directory / f"{artefact.id}-{slugify(artefact.title)}.md")

    # ----------------------------------------------------------------- writing

    def save_hazard(
        self,
        hazard: Hazard,
        author: Author,
        *,
        message: str | None = None,
    ) -> str | None:
        """Validate, write, regenerate the hazard log, and commit.

        Returns the commit SHA, or None if nothing changed on disk.
        """
        self._validate_cross_references(hazard=hazard)
        return self._save(
            hazard,
            author=author,
            message=message or f"feat({hazard.id}): {hazard.title}",
            regenerate_log=True,
        )

    def save_mitigation(
        self,
        mitigation: Mitigation,
        author: Author,
        *,
        message: str | None = None,
    ) -> str | None:
        """Validate, write, regenerate the hazard log, and commit."""
        self._validate_cross_references(mitigation=mitigation)
        return self._save(
            mitigation,
            author=author,
            message=message or f"feat({mitigation.id}): {mitigation.title}",
            # A mitigation's status appears in the hazard log, so it has to be
            # regenerated here too.
            regenerate_log=True,
        )

    def _save(
        self,
        artefact: Hazard | Mitigation,
        *,
        author: Author,
        message: str,
        regenerate_log: bool,
    ) -> str | None:
        relative = self.path_for(artefact)
        target = self.root / relative

        # A retitled artefact moves file. Remove the old path through Git so the
        # move is recorded as a rename and `git log --follow` keeps working.
        for existing in self._artefact_paths(Path(relative).parent, artefact.id.split("-")[0]):
            if existing.name.startswith(f"{artefact.id}-") and existing != target:
                git.run(
                    ["rm", "--quiet", "--", str(existing.relative_to(self.root))], cwd=self.root
                )

        frontmatter.write(target, artefact.to_frontmatter(), artefact.body)

        if regenerate_log:
            self._write_hazard_log()

        return git.commit_all(self.root, message, author=author)

    def close_hazard(
        self,
        hazard_id: str,
        justification: str,
        author: Author,
    ) -> str | None:
        """Close a hazard with a justification.

        There is no `delete_hazard`. Hazards are never deleted - a safety record
        that can disappear is not a safety record - so closing is the only exit,
        and it requires a reason.
        """
        hazard = self.hazard(hazard_id)
        hazard.status = "closed"
        hazard.justification = justification
        hazard.updated = date.today()
        hazard.__post_init__()  # re-run validation after mutation
        return self.save_hazard(
            hazard,
            author,
            message=f"feat({hazard.id}): close hazard",
        )

    def _write_hazard_log(self) -> None:
        (self.root / HAZARD_LOG_PATH).write_text(
            render_hazard_log(
                hazards=self.hazards(),
                mitigations=self.mitigations(),
                name=self.manifest.name,
            ),
            encoding="utf-8",
        )

    # -------------------------------------------------------------- validation

    def _validate_cross_references(
        self,
        *,
        hazard: Hazard | None = None,
        mitigation: Mitigation | None = None,
    ) -> None:
        """Layout rule 5: references must exist and agree on both sides.

        Checked against what is already on disk plus the artefact being saved,
        so saving a hazard that names a mitigation which does not exist yet
        fails loudly instead of leaving a dangling reference in the record.
        """
        if hazard is not None:
            known = {existing.id for existing in self.mitigations()}
            unknown = set(hazard.mitigations) - known
            if unknown:
                raise ValidationError(
                    f"{hazard.id} references mitigations that do not exist: "
                    f"{', '.join(sorted(unknown))}. Create them first, or remove "
                    "the reference."
                )
        if mitigation is not None:
            known = {existing.id for existing in self.hazards()}
            unknown = set(mitigation.hazards) - known
            if unknown:
                raise ValidationError(
                    f"{mitigation.id} references hazards that do not exist: "
                    f"{', '.join(sorted(unknown))}."
                )

    def validate(self) -> list[str]:
        """Check the whole safety file. Returns a list of problems, empty if sound.

        Returns rather than raises, because the interface needs to show a CSO
        everything that is wrong at once, not the first thing.
        """
        problems: list[str] = []

        try:
            hazards = self.hazards()
        except Exception as exc:  # noqa: BLE001 - reporting, not handling
            return [f"could not read hazards: {exc}"]
        try:
            mitigations = self.mitigations()
        except Exception as exc:  # noqa: BLE001
            return [f"could not read mitigations: {exc}"]

        hazard_ids = {hazard.id for hazard in hazards}
        mitigation_ids = {mitigation.id for mitigation in mitigations}

        for hazard in hazards:
            for mitigation_id in hazard.mitigations:
                if mitigation_id not in mitigation_ids:
                    problems.append(f"{hazard.id} references unknown {mitigation_id}")
                else:
                    reverse = self.mitigation(mitigation_id).hazards
                    if hazard.id not in reverse:
                        problems.append(
                            f"{hazard.id} lists {mitigation_id}, but {mitigation_id} "
                            f"does not list {hazard.id}"
                        )

        for mitigation in mitigations:
            for hazard_id in mitigation.hazards:
                if hazard_id not in hazard_ids:
                    problems.append(f"{mitigation.id} references unknown {hazard_id}")
                else:
                    reverse = self.hazard(hazard_id).mitigations
                    if mitigation.id not in reverse:
                        problems.append(
                            f"{mitigation.id} lists {hazard_id}, but {hazard_id} "
                            f"does not list {mitigation.id}"
                        )

        return problems

    # ------------------------------------------------------------- audit trail

    def history(self, file_path: str | None = None, limit: int = 50) -> list[Commit]:
        """The commit history of one artefact, or of the whole safety file."""
        return git.history(self.root, file_path=file_path, limit=limit)

    def hazard_history(self, hazard_id: str, limit: int = 50) -> list[Commit]:
        """Every recorded decision about one hazard."""
        return self.history(self.path_for(self.hazard(hazard_id)), limit=limit)

    def version_at(self, revision: str, file_path: str) -> str:
        """An artefact as it stood at a past commit."""
        return git.show(self.root, revision, file_path)

    @property
    def head_sha(self) -> str:
        return git.head_sha(self.root)

    @property
    def is_clean(self) -> bool:
        return git.is_clean(self.root)
