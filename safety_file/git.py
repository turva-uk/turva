"""A thin wrapper over the `git` command line.

Uses `subprocess` rather than GitPython or pygit2. The operations needed here -
init, add, commit, log for one path, show a blob at a revision - are a handful of
commands, and running them explicitly means the audit trail is produced by the
same tool a reviewer will use to inspect it. No binding layer to misunderstand.

Two rules this module exists to enforce:

1. **Author identity is always explicit.** Every commit names the person who
   caused it, passed in by the caller. Nothing falls back to global git config,
   `$USER`, or a service account, because an audit trail that attributes a
   clinician's safety decision to "root" is not an audit trail (TH-004 in
   SAFETY.md).
2. **No shell.** Arguments are passed as a list and never interpolated into a
   shell string, so a hazard title containing a quote or a semicolon cannot
   become a command.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .errors import GitError

#: Commits made by Turva itself, where no human caused the change (for example
#: the initial scaffold). Use a real person's identity whenever one is known.
SYSTEM_AUTHOR_NAME = "Turva"
SYSTEM_AUTHOR_EMAIL = "noreply@turva.org"


@dataclass(frozen=True)
class Author:
    """The person a commit is attributed to."""

    name: str
    email: str

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("commit author name must not be empty")
        if not self.email.strip():
            raise ValueError("commit author email must not be empty")


SYSTEM_AUTHOR = Author(SYSTEM_AUTHOR_NAME, SYSTEM_AUTHOR_EMAIL)


@dataclass(frozen=True)
class Commit:
    """One entry in a safety artefact's history."""

    sha: str
    author_name: str
    author_email: str
    committed_at: datetime
    subject: str

    @property
    def short_sha(self) -> str:
        return self.sha[:8]


def run(
    args: list[str],
    *,
    cwd: Path,
    author: Author | None = None,
    check: bool = True,
) -> str:
    """Run a git command in `cwd` and return its stdout.

    `author` sets both the author and committer identity for this invocation
    only, via `-c` overrides. Passing it per-command rather than writing it into
    the repository config means concurrent commits by different users cannot
    race over a shared setting.
    """
    command = ["git"]
    if author is not None:
        command += [
            "-c",
            f"user.name={author.name}",
            "-c",
            f"user.email={author.email}",
        ]
    command += args

    result = subprocess.run(  # noqa: S603 - fixed executable, list args, no shell
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and result.returncode != 0:
        raise GitError(args, result.returncode, result.stderr)
    return result.stdout


def init(path: Path) -> None:
    """Create a new repository at `path` with `main` as the initial branch."""
    path.mkdir(parents=True, exist_ok=True)
    run(["init", "--initial-branch=main", "--quiet"], cwd=path)


def is_repository(path: Path) -> bool:
    """Whether `path` is the root of a Git working tree."""
    return (path / ".git").is_dir()


def commit_all(
    path: Path,
    message: str,
    author: Author,
    *,
    paths: list[str] | None = None,
) -> str | None:
    """Stage and commit. Returns the new commit SHA, or None if nothing changed.

    Returning None rather than raising on an empty commit lets callers save
    idempotently: pressing "save" without having changed anything should not be
    an error, and should not create an empty commit that implies a decision was
    revisited when it was not.
    """
    run(["add", "--"] + (paths if paths else ["."]), cwd=path)

    staged = run(["diff", "--cached", "--name-only"], cwd=path).strip()
    if not staged:
        return None

    run(["commit", "--quiet", "--message", message], cwd=path, author=author)
    return head_sha(path)


def head_sha(path: Path) -> str:
    """The SHA of the current HEAD commit."""
    return run(["rev-parse", "HEAD"], cwd=path).strip()


def history(path: Path, file_path: str | None = None, limit: int = 50) -> list[Commit]:
    """Commits affecting `file_path`, or the whole repository if None.

    This is the audit trail for a single safety artefact: `history(repo,
    "docs/hazards/HAZ-001-....md")` is the complete record of decisions about
    that hazard, with who and when.
    """
    # Unit separator between fields, record separator between commits: a hazard
    # title or commit subject can contain anything, including newlines, so
    # delimiters have to be characters that cannot appear in the data.
    fmt = "%H\x1f%an\x1f%ae\x1f%cI\x1f%s\x1e"
    args = ["log", f"--max-count={limit}", f"--format={fmt}"]
    if file_path is not None:
        args += ["--", file_path]

    output = run(args, cwd=path)

    commits: list[Commit] = []
    for record in output.split("\x1e"):
        record = record.strip("\n")
        if not record:
            continue
        sha, name, email, committed, subject = record.split("\x1f")
        commits.append(
            Commit(
                sha=sha,
                author_name=name,
                author_email=email,
                committed_at=datetime.fromisoformat(committed),
                subject=subject,
            )
        )
    return commits


def paths_ever_added(path: Path, pathspec: str) -> set[str]:
    """Every path matching `pathspec` that has ever been added to this repository.

    Includes paths since deleted or renamed. This is how the repository answers
    "which identifiers have ever been allocated?" without needing a counter
    somewhere that could drift: Git already knows, because it has the whole
    history, and Git is the system of record.
    """
    output = run(
        [
            "log",
            "--all",
            "--diff-filter=A",
            "--name-only",
            "--format=",
            "--",
            pathspec,
        ],
        cwd=path,
    )
    return {line.strip() for line in output.splitlines() if line.strip()}


def show(path: Path, revision: str, file_path: str) -> str:
    """The contents of `file_path` as it was at `revision`.

    Used to display a historical version of a safety artefact: what the hazard
    actually said at the time a decision was signed off.
    """
    return run(["show", f"{revision}:{file_path}"], cwd=path)


def is_clean(path: Path) -> bool:
    """Whether the working tree has no uncommitted changes.

    Should normally be true: Turva commits on save. A dirty tree means something
    wrote to the repository without going through the storage layer, which is
    worth surfacing rather than silently committing on the next save.
    """
    return not run(["status", "--porcelain"], cwd=path).strip()
