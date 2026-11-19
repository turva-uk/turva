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
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, replace
from datetime import date
from pathlib import Path
from typing import Any, Self

import yaml

from . import frontmatter, git
from .errors import (
    DirtyRepositoryError,
    NotASafetyFileError,
    SchemaVersionError,
    StaleVersionError,
    ValidationError,
)
from .git import Author, Commit
from .locking import RepositoryLock
from .models import Hazard, Manifest, Mitigation
from .render import render_hazard_log
from .team import FileTeam

MANIFEST_PATH = Path(".turva") / "manifest.yaml"
TEAM_PATH = Path(".turva") / "team.yaml"
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
        self._lock = RepositoryLock(self.root)
        if not git.is_repository(self.root):
            raise NotASafetyFileError(f"{self.root} is not a Git repository")
        if not (self.root / MANIFEST_PATH).is_file():
            raise NotASafetyFileError(
                f"{self.root} has no {MANIFEST_PATH}; it is a Git repository but "
                "not a Turva safety file"
            )
        self._check_schema_version()

    @contextmanager
    def snapshot(self, *, timeout: float = 5) -> Iterator[Self]:
        """A coherent multi-read response while participating writers are excluded."""
        with self._lock.hold(exclusive=False, timeout=timeout):
            if not self.is_clean or self._ignored_artefacts():
                raise DirtyRepositoryError(
                    "This safety file has uncommitted changes. They cannot be presented as "
                    "committed evidence; ask an administrator to inspect the repository."
                )
            self._check_schema_version()
            self.team()
            yield self

    @contextmanager
    def edit(self, *, expected_head: str | None = None, timeout: float = 5) -> Iterator[Self]:
        """Serialise a complete edit, including identifier allocation and the log.

        Callers editing an earlier read must supply its full HEAD. This rejects
        stale forms, rather than merging safety judgements or losing updates.
        Nested saves on this instance keep the outer lock. No failed write is
        discarded: a dirty tree blocks further writes until an administrator
        inspects it. This is a lock, not a rollback transaction.
        """
        with self._lock.hold(exclusive=True, timeout=timeout):
            if expected_head is not None and self.head_sha != expected_head:
                raise StaleVersionError(
                    "This safety file changed after you opened it. Nothing from this request "
                    "was saved. Keep your draft, open the latest version in another tab, "
                    "and compare before starting a fresh edit."
                )
            if not self.is_clean or self._ignored_artefacts():
                raise DirtyRepositoryError(
                    "This safety file has uncommitted changes. No new save is allowed: ask "
                    "an administrator to inspect them so they are not attributed to you."
                )
            self._check_schema_version()
            self.team()
            yield self

    def _ignored_artefacts(self) -> bool:
        # `git status` intentionally hides ignored files, but the domain reader
        # must not present an ignored/untracked hazard as committed evidence.
        return bool(
            git.run(
                [
                    "ls-files",
                    "--others",
                    "--ignored",
                    "--exclude-standard",
                    "--",
                    f"{HAZARDS_DIR}/HAZ-*.md",
                    f"{MITIGATIONS_DIR}/MIT-*.md",
                    str(TEAM_PATH),
                    str(MANIFEST_PATH),
                ],
                cwd=self.root,
            ).strip()
        )

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
                # Owner-only files stay version 1 until explicitly adopted.
                # Version 2 requires the named team written by save_team().
                schema_version=1,
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
        if type(version) is not int or version < 1:
            raise SchemaVersionError("A safety-file schema version must be a positive integer")
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
        try:
            return Manifest.from_dict(yaml.safe_load(raw))
        except yaml.YAMLError as exc:
            raise ValidationError("The safety-file manifest YAML could not be read") from exc

    def team(self) -> FileTeam | None:
        """The recorded team, never an assertion that appointments remain valid."""
        self._check_schema_version()
        path = self.root / TEAM_PATH
        if self.manifest.schema_version == 1:
            if path.exists():
                raise ValidationError("A version-1 file cannot contain a version-2 team record")
            return None
        if not path.is_file() or path.is_symlink():
            raise ValidationError("A version-2 safety file requires its own .turva/team.yaml")
        try:
            return FileTeam.from_dict(yaml.safe_load(path.read_text(encoding="utf-8")))
        except yaml.YAMLError as exc:
            raise ValidationError("The file team YAML could not be read") from exc

    def save_team(self, team: FileTeam, author: Author) -> str | None:
        """Adopt a legacy file or replace its team in one attributable commit.

        This is the explicit v1-to-v2 upgrade; no evidence pages are rewritten.
        Organisation transfers require a separate deliberate workflow.
        """
        team = FileTeam.from_dict(team.to_dict())
        with self.edit():
            previous = self.team()
            if previous and previous.organisation_id != team.organisation_id:
                raise ValidationError("A file team cannot transfer a file to another organisation")
            for path in (TEAM_PATH, MANIFEST_PATH):
                if git.run(["check-ignore", "--", str(path)], cwd=self.root, check=False).strip():
                    raise ValidationError("Git ignores the team or manifest; nothing was written")
            manifest = yaml.safe_load((self.root / MANIFEST_PATH).read_text(encoding="utf-8"))
            manifest["schema_version"] = 2
            (self.root / MANIFEST_PATH).write_text(
                yaml.safe_dump(manifest, sort_keys=False), encoding="utf-8"
            )
            (self.root / TEAM_PATH).write_text(
                yaml.safe_dump(team.to_dict(), sort_keys=False, allow_unicode=True),
                encoding="utf-8",
            )
            return git.commit_all(
                self.root, "feat(team): record named CSOs and accountability", author=author
            )

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
        with self.edit():
            # Dataclasses are mutable. Constructor validation alone does not
            # protect a caller that edits a loaded object before saving it.
            hazard.initial.__post_init__()
            hazard.residual.__post_init__()
            hazard.__post_init__()
            self._validate_cross_references(hazard=hazard)
            return self._save(
                hazard,
                author=author,
                message=message or f"feat({hazard.id}): {hazard.title}",
            )

    def save_mitigation(
        self,
        mitigation: Mitigation,
        author: Author,
        *,
        message: str | None = None,
    ) -> str | None:
        """Validate, write, regenerate the hazard log, and commit."""
        with self.edit():
            mitigation.__post_init__()
            # Legacy version-1 files may lack evidence: keep them readable, but
            # never save an evidenced status without an evidence statement.
            if mitigation.status in {"implemented", "verified"} and not mitigation.evidence.strip():
                raise ValidationError(
                    f"{mitigation.id}: an implemented or verified mitigation must record evidence"
                )
            self._validate_cross_references(mitigation=mitigation)
            return self._save(
                mitigation,
                author=author,
                message=message or f"feat({mitigation.id}): {mitigation.title}",
            )

    def _save(
        self,
        artefact: Hazard | Mitigation,
        *,
        author: Author,
        message: str,
    ) -> str | None:
        # A link is one decision, not two independent saves. Prepare both sides
        # before touching disk, then publish them and the generated log in one
        # attributable commit under the outer edit lock (TH-003/TH-004).
        if problems := self.validate():
            raise ValidationError(
                "This safety file does not validate. Ask an administrator to inspect it "
                "before saving: " + "; ".join(problems)
            )
        pending: list[Hazard | Mitigation] = [artefact]
        related: list[Hazard] | list[Mitigation]
        if isinstance(artefact, Hazard):
            related = self.mitigations()
            selected = artefact.mitigations
            reverse_field = "hazards"
        else:
            related = self.hazards()
            selected = artefact.hazards
            reverse_field = "mitigations"
        for other in related:
            references = getattr(other, reverse_field)
            wanted = other.id in selected
            if (artefact.id in references) != wanted:
                references = [identifier for identifier in references if identifier != artefact.id]
                if wanted:
                    references.append(artefact.id)
                # The field is named at run time, so mypy cannot check its
                # type here; reverse_field is always a list of identifiers.
                reverse_link: dict[str, Any] = {reverse_field: sorted(references)}
                pending.append(
                    replace(
                        other,
                        **reverse_link,
                        updated=max(other.updated, artefact.updated),
                    )
                )

        # Check every destination before the first write, including counterparts
        # and the log. Otherwise an ignored reverse link can leave half an edit.
        paths = [self.path_for(item) for item in pending] + [str(HAZARD_LOG_PATH)]
        for relative in paths:
            if git.run(["check-ignore", "--", relative], cwd=self.root, check=False).strip():
                raise ValidationError(
                    "Git ignores this safety evidence path. Ask an administrator to inspect the ignore rules before saving; nothing from this save was written."
                )
        for item in pending:
            relative = self.path_for(item)
            target = self.root / relative
            # A retitle moves the file without changing its permanent identity.
            for existing in self._artefact_paths(Path(relative).parent, item.id.split("-")[0]):
                if existing.name.startswith(f"{item.id}-") and existing != target:
                    git.run(
                        ["rm", "--quiet", "--", str(existing.relative_to(self.root))], cwd=self.root
                    )
            frontmatter.write(target, item.to_frontmatter(), item.body)
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
        with self.edit():
            hazard = self.hazard(hazard_id)
            hazard.status = "closed"
            hazard.justification = justification
            hazard.updated = date.today()
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

    def mitigation_history(self, mitigation_id: str, limit: int = 50) -> list[Commit]:
        """Every recorded decision about one mitigation, including link changes."""
        return self.history(self.path_for(self.mitigation(mitigation_id)), limit=limit)

    def version_at(self, revision: str, file_path: str) -> str:
        """An artefact as it stood at a past commit."""
        return git.show(self.root, revision, file_path)

    @property
    def head_sha(self) -> str:
        return git.head_sha(self.root)

    @property
    def is_clean(self) -> bool:
        return git.is_clean(self.root)
