"""Rebuild the safety file index from the repositories on disk.

`architecture-principles.md` claims the database is "an index over those
repositories ... and it must be rebuildable from them". This command is what
makes that a fact rather than an aspiration, and it has two real uses:

- recovering a row lost because indexing failed after the repository was written
- restoring the index after a database loss, from a backup of the repositories
  alone

It is also the honest test of the architecture. If this command cannot
reconstruct a usable index, then something has been allowed to live only in the
database, and that is the invariant breaking.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile
from safety_file import SafetyFileRepository
from safety_file.errors import SafetyFileError


class Command(BaseCommand):
    help = "Rebuild the safety file index from the repositories on disk."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--owner",
            help=(
                "Email address to assign as owner for repositories with no "
                "existing index row. Ownership is deployment state, not safety "
                "evidence, so it cannot be recovered from the repository."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    def handle(self, *args, **options) -> None:
        root = Path(settings.SAFETY_FILE_ROOT)
        if not root.is_dir():
            raise CommandError(f"Safety file root does not exist: {root}")

        fallback_owner = None
        if options["owner"]:
            try:
                fallback_owner = User.objects.get(email__iexact=options["owner"])
            except User.DoesNotExist as exc:
                raise CommandError(f"No user with email {options['owner']}") from exc

        adopted, updated, skipped, missing = [], [], [], []

        for path in sorted(p for p in root.iterdir() if p.is_dir()):
            try:
                repository = SafetyFileRepository(path)
            except SafetyFileError as exc:
                skipped.append((path.name, str(exc)))
                continue

            manifest = repository.manifest
            existing = SafetyFile.objects.filter(id=manifest.project_id).first()

            if existing is None:
                if fallback_owner is None:
                    skipped.append((path.name, "no index row and no --owner given to assign one"))
                    continue
                adopted.append((path.name, manifest.name))
                if not options["dry_run"]:
                    with transaction.atomic():
                        SafetyFile.objects.create(
                            id=manifest.project_id,
                            slug=path.name,
                            name=manifest.name,
                            standard=manifest.standard,
                            organisation=_organisation_from(path),
                            owner=fallback_owner,
                        )
            elif (existing.name, existing.standard, existing.slug) != (
                manifest.name,
                manifest.standard,
                path.name,
            ):
                updated.append((path.name, existing.name, manifest.name))
                if not options["dry_run"]:
                    existing.name = manifest.name
                    existing.standard = manifest.standard
                    existing.slug = path.name
                    existing.save(update_fields=["name", "standard", "slug"])

        for row in SafetyFile.objects.all():
            if not row.exists_on_disk:
                missing.append((row.slug, str(row.repository_path)))

        self._report(adopted, updated, skipped, missing, dry_run=options["dry_run"])

    def _report(self, adopted, updated, skipped, missing, *, dry_run: bool) -> None:
        verb = "Would adopt" if dry_run else "Adopted"
        for name, title in adopted:
            self.stdout.write(self.style.SUCCESS(f"{verb} {name}: {title}"))
        verb = "Would update" if dry_run else "Updated"
        for name, was, now in updated:
            self.stdout.write(f"{verb} {name}: {was!r} -> {now!r}")
        for name, reason in skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {name}: {reason}"))
        for slug, path in missing:
            self.stdout.write(
                self.style.ERROR(
                    f"Indexed but not on disk: {slug} (expected at {path}). The "
                    "repository is the record - restore it rather than deleting "
                    "the row."
                )
            )

        self.stdout.write(
            f"\n{len(adopted)} adopted, {len(updated)} updated, "
            f"{len(skipped)} skipped, {len(missing)} missing from disk."
            + (" Dry run: nothing was written." if dry_run else "")
        )


def _organisation_from(path: Path) -> str:
    """Recover the organisation from the repository's mkdocs copyright line.

    Organisation is not in the manifest, which is a gap in the on-disk schema
    rather than a gap here: a safety file should say which organisation it
    belongs to without reference to any database. Recorded in the roadmap.
    """
    config = path / "mkdocs.yml"
    if not config.is_file():
        return ""
    try:
        return str(yaml.safe_load(config.read_text(encoding="utf-8")).get("copyright", ""))
    except yaml.YAMLError:
        return ""
