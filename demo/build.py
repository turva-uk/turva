"""Build the demo safety file from its YAML definition.

Deliberately goes through `SafetyFileRepository` rather than writing files
directly, so seeding the demo exercises the production storage layer end to end.
If validation, identifier allocation, cross-reference checking, hazard log
generation or commit attribution are broken, this script fails - which makes it
an integration test that happens to produce a useful demo.

Each artefact is committed separately, by its named author, so the resulting
audit trail resembles one produced by real use rather than a bulk import.

Usage:
    python demo/build.py [target-directory]

Default target is `.turva-data/safety-files/demo-bp-at-home`, which is
gitignored - the demo is a *generated* Git repository, and nesting one inside
this repository would confuse both.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from safety_file import Author, SafetyFileRepository  # noqa: E402
from safety_file.models import Assessment, Hazard, Mitigation  # noqa: E402

DEFINITION = Path(__file__).resolve().parent / "riverbank-bp-at-home.yaml"
DEFAULT_TARGET = REPO_ROOT / ".turva-data" / "safety-files" / "demo-bp-at-home"


def _author(definition: dict[str, Any], key: str) -> Author:
    entry = definition["authors"][key]
    return Author(name=entry["name"], email=entry["email"])


def build(target: Path, *, force: bool = False) -> SafetyFileRepository:
    definition = yaml.safe_load(DEFINITION.read_text(encoding="utf-8"))

    if target.exists():
        if not force:
            raise SystemExit(
                f"{target} already exists. Pass --force to replace it, which "
                "destroys its Git history."
            )
        shutil.rmtree(target)

    template_dir = REPO_ROOT / "templates" / definition["template"]
    cso = _author(definition, "cso")

    repo = SafetyFileRepository.create(
        target,
        name=definition["name"],
        standard=definition["standard"],
        template_dir=template_dir,
        values=definition["values"],
        author=cso,
        created=definition["created"],
    )

    # Mitigations first. A hazard may not reference a mitigation that does not
    # exist yet - the storage layer enforces that - so the order here is forced
    # by the same rule that protects real data from dangling references.
    #
    # The `hazards` back-reference on each mitigation is applied in a second
    # pass below, once the hazards exist.
    for entry in definition["mitigations"]:
        repo.save_mitigation(
            Mitigation(
                id=entry["id"],
                title=entry["title"],
                status=entry["status"],
                owner=entry["owner"],
                created=entry["created"],
                updated=entry["updated"],
                control_type=entry["control_type"],
                evidence=entry.get("evidence", ""),
                body=entry.get("body", ""),
            ),
            author=_author(definition, entry["author"]),
            message=f"feat({entry['id']}): add mitigation - {entry['title']}",
        )

    for entry in definition["hazards"]:
        repo.save_hazard(
            Hazard(
                id=entry["id"],
                title=entry["title"],
                status=entry["status"],
                owner=entry["owner"],
                created=entry["created"],
                updated=entry["updated"],
                initial=Assessment(**entry["initial"]),
                residual=Assessment(**entry["residual"]),
                cause=entry.get("cause", ""),
                effect=entry.get("effect", ""),
                harm=entry.get("harm", ""),
                justification=entry.get("justification", ""),
                mitigations=entry.get("mitigations", []),
                body=entry.get("body", ""),
            ),
            author=_author(definition, entry["author"]),
            message=f"feat({entry['id']}): identify hazard - {entry['title']}",
        )

    # Second pass: record the hazard side of each relationship. The layout
    # requires the link on both sides so that either file read alone is
    # complete.
    for entry in definition["mitigations"]:
        if not entry.get("hazards"):
            continue
        mitigation = repo.mitigation(entry["id"])
        mitigation.hazards = entry["hazards"]
        repo.save_mitigation(
            mitigation,
            author=_author(definition, entry["author"]),
            message=f"feat({entry['id']}): link to {', '.join(entry['hazards'])}",
        )

    return repo


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", nargs="?", type=Path, default=DEFAULT_TARGET)
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing demo, destroying its Git history",
    )
    args = parser.parse_args()

    repo = build(args.target, force=args.force)

    problems = repo.validate()
    hazards = repo.hazards()
    blocking = [
        hazard for hazard in hazards if hazard.status == "open" and hazard.requires_elimination
    ]
    commits = repo.history(limit=200)

    print(f"Built demo safety file at {repo.root}")
    print(f"  manifest     : {repo.manifest.name} ({repo.manifest.standard})")
    print(f"  hazards      : {len(hazards)}")
    print(f"  mitigations  : {len(repo.mitigations())}")
    print(f"  commits      : {len(commits)}")
    print(f"  contributors : {len({commit.author_email for commit in commits})}")
    print(f"  working tree : {'clean' if repo.is_clean else 'DIRTY'}")
    print(f"  blocking     : {len(blocking)} open hazard(s) at residual risk 4-5")

    if problems:
        print("\nValidation problems:")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print("\nValidation: no problems found.")
    print(f"\nInspect the audit trail with:\n  git -C {repo.root} log --format='%h %an %s'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
