#!/usr/bin/env python3
"""Drop merged branches from the local gh-stack record.

`gh stack sync --prune` deletes the *local branch* of a merged pull
request, which is the half that frees the name. It does not remove the
branch's entry from the stack, so a stack that has been landing units for
a few days draws more merged rows than live ones, and every one of them
has nothing left behind it - the branch is already gone.

Worse, those entries are not only noise. `gh stack rebase` walks the chain
from the bottom, and an entry whose branch cannot be checked out costs it
the base it should be rebasing onto: it falls back to replaying the
trunk's own history, which arrives as a long run of conflicts against
commits that merged days ago. That is the failure this script exists to
prevent, seen on 2026-09-18 replaying 58 commits.

An entry is finished, and dropped, in either of two cases.

**Its local branch is gone.** Whatever its pull request is recorded as,
an entry with no branch behind it is the broken chain above.

**Its branch is still there, but its tip is already in the trunk**, and
gh-stack is not going to tidy it up itself. That second half matters:
`gh stack sync --prune` deletes the branch of a pull request it sees
merge, and an entry dropped before it gets there leaves that branch
behind. So a branch whose tip is in the trunk is dropped only when:

- the record already says its pull request merged, so gh-stack has seen
  the merge and left the branch; or
- GitHub says the recorded pull request is closed without merging; or
- no pull request is recorded at all.

The closed case is the one this rule exists for. A pull request that is
closed and replaced by another on the same branch (#1363 by #1386, on
2026-10-02) leaves the record pointing at the closed one. When the
replacement merges, gh-stack never learns of it, keeps the entry as
live, and pushes a branch GitHub has deleted. The tip being in the
trunk is the evidence the recorded number cannot give.

Three entries are always left alone, whatever the trunk holds:

- a branch checked out in any worktree, which is somebody's working
  copy. The record is shared by every worktree, so this is not only the
  one it is run from;
- a branch with no commits of its own, whose tip is its own base: it is
  in the trunk only because nothing has been put on it yet;
- one whose recorded pull request GitHub cannot be asked about. Not
  knowing is not evidence, so it stays.

Exit codes: 0 wrote a change or found nothing to do, 1 the record could
not be read.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def stack_file() -> Path | None:
    """Where gh-stack keeps its record, or None if absent.

    One record serves every worktree: gh-stack keeps it in the shared
    git directory, not in each worktree's own. `--git-path` would name a
    per-worktree file that gh-stack never writes, so from any worktree
    but the main checkout this would find nothing and tidy nothing.
    """
    try:
        out = subprocess.run(
            [
                "git",
                "rev-parse",
                "--path-format=absolute",
                "--git-common-dir",
            ],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except OSError, subprocess.CalledProcessError:
        return None

    path = Path(out) / "gh-stack"

    return path if path.is_file() else None


def branch_exists(name: str) -> bool:
    return (
        subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", name],
            capture_output=True,
        ).returncode
        == 0
    )


def rev_parse(name: str) -> str | None:
    """The commit a name points at, or None when it points at nothing."""
    result = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"{name}^{{commit}}"],
        capture_output=True,
        text=True,
    )

    return result.stdout.strip() if result.returncode == 0 else None


def checked_out_branches() -> set[str]:
    """The branch checked out in each worktree of this repository.

    The record is shared, so a branch at work in another worktree is
    somebody's working copy just as much as the one checked out here.
    """
    result = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        return set()

    prefix = "branch refs/heads/"

    return {line[len(prefix) :] for line in result.stdout.splitlines() if line.startswith(prefix)}


def tip_in_trunk(name: str, trunk: str) -> bool:
    """Whether everything on a branch is already in the trunk.

    Asked of `origin/<trunk>` first: the local trunk is often behind in
    a worktree, since only one worktree can have it checked out.
    """
    for ref in (f"origin/{trunk}", trunk):
        if rev_parse(ref) is None:
            continue
        return (
            subprocess.run(
                ["git", "merge-base", "--is-ancestor", name, ref],
                capture_output=True,
            ).returncode
            == 0
        )

    return False


def pull_request_state(number: object) -> str | None:
    """GitHub's state for a pull request, or None when it cannot be had.

    OPEN, CLOSED or MERGED. None covers gh missing, the network down and
    a number GitHub does not know: each is "not known", never "closed".
    """
    if not isinstance(number, int):
        return None
    try:
        result = subprocess.run(
            [
                "gh",
                "pr",
                "view",
                str(number),
                "--json",
                "state",
                "--jq",
                ".state",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except OSError, subprocess.TimeoutExpired:
        return None

    state = result.stdout.strip()

    return state if result.returncode == 0 and state else None


def is_finished(entry: dict[str, object], trunk: str, checked_out: set[str]) -> bool:
    """Whether an entry has nothing left to land. See the module docstring."""
    name = str(entry.get("branch", ""))

    if not name:
        return False
    if not branch_exists(name):
        return True
    if name in checked_out:
        return False

    tip = rev_parse(name)
    base = entry.get("base")

    if tip is None or (isinstance(base, str) and rev_parse(base) == tip):
        return False
    if not tip_in_trunk(name, trunk):
        return False

    raw = entry.get("pullRequest")
    pull_request = raw if isinstance(raw, dict) else {}

    if not pull_request or pull_request.get("merged"):
        return True

    return pull_request_state(pull_request.get("number")) == "CLOSED"


def main() -> int:
    path = stack_file()

    if path is None:
        # Not an error: a repository with no stack has nothing to tidy, and
        # this runs unconditionally after a sync.
        return 0

    try:
        record = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"✗ Could not read the stack record: {exc}", file=sys.stderr)
        return 1

    stacks = record.get("stacks")

    if not isinstance(stacks, list):
        return 0

    checked_out = checked_out_branches()
    dropped: list[str] = []

    for stack in stacks:
        branches = stack.get("branches")
        if not isinstance(branches, list):
            continue

        trunk_name = str((stack.get("trunk") or {}).get("branch") or "main")
        kept = []
        for entry in branches:
            if isinstance(entry, dict) and is_finished(entry, trunk_name, checked_out):
                dropped.append(str(entry.get("branch", "")))
                continue
            kept.append(entry)

        # Re-chain what is left: the bottom sits on the trunk, and each
        # branch above on the one below. Without this a dropped entry
        # leaves the branch above it pointing at a commit that is no
        # longer named in the stack, which is the broken chain again by
        # another route.
        trunk = (stack.get("trunk") or {}).get("head")
        previous = trunk
        for entry in kept:
            if previous is not None:
                entry["base"] = previous
            previous = entry.get("head", previous)

        stack["branches"] = kept

    if not dropped:
        return 0

    path.write_text(json.dumps(record, indent=2))
    noun = "branch" if len(dropped) == 1 else "branches"
    print(f"  Forgot {len(dropped)} finished {noun}:")
    for name in dropped:
        print(f"      {name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
