#!/usr/bin/env python3
"""Put a stack's open pull requests into a stack on GitHub by linking.

`just stack-refresh` rebuilds the local record with `gh stack unstack`
and then adopts the branches again. That unstack is also asked of
GitHub, which refuses once any pull request in the stack has merged ("Pull
requests #1356, #1358 cannot be removed from this stack"). On
2026-10-02 that left the open pull requests in no stack on GitHub at
all, and they were put back by hand. This script is that repair.

It leaves the old stack on GitHub alone. The recipe rebuilds the local
record without touching GitHub (`gh stack unstack --local`, then
`gh stack init`), and then calls this to:

- find the open pull request for each branch, by asking GitHub rather
  than trusting the number in the record, which is wrong for a pull
  request that was closed and replaced;
- `gh stack link` them, bottom to top. That makes a new stack when
  they are in none, and changes nothing when they are still in one;
- write that stack's `id` and `number` into the local record, so
  gh-stack treats the two as the same stack.

Pull requests are linked by number, never by branch name: given a
branch, `gh stack link` pushes it first, and a refresh must not push.

It also checks, and repairs, GitHub's stack for a stack that has only
drifted. `gh stack submit` only ever adds to GitHub's stack, and reports
a pull request it could not add as a warning, exiting 0. On 2026-10-16
a 24-branch stack was found split in two on GitHub, with eight pull
requests in neither: a closed pull request left at the top of GitHub's
stack refused every addition after it, since each must be based on the
one below. Nothing said so until the stack was opened in a browser.

Four modes:

    stack-relink.py --needed              exit 0 when GitHub's stack for
                                          the current branch holds a
                                          merged pull request, 1 when it
                                          does not
    stack-relink.py --link <branch>...    link and repoint, as above
    stack-relink.py --check <branch>...   exit 0 when the open pull
                                          requests are one stack on
                                          GitHub, in this order, with no
                                          closed one in it; 1 when not,
                                          saying what is wrong
    stack-relink.py --repair <branch>...  add any missing from the top
                                          of the stack holding the rest;
                                          failing that, unstack every
                                          stack on GitHub holding them,
                                          keeping the local record, then
                                          link and repoint

Exit codes for `--link` and `--repair`: 0 linked and recorded, 1 it
could not be done.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def record_path() -> Path | None:
    """Where gh-stack keeps its record, or None if absent.

    One record serves every worktree, in the shared git directory.
    `--git-path` would name a per-worktree file that gh-stack never
    writes.
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


def read_record(path: Path) -> dict[str, object] | None:
    try:
        record = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"✗ Could not read the stack record: {exc}", file=sys.stderr)
        return None

    return record if isinstance(record, dict) else None


def stack_holding(record: dict[str, object], branch: str) -> dict[str, object] | None:
    """The stack in the record that this branch belongs to.

    The record keeps every stack any worktree has had, most of them
    empty by now. The last match wins: a branch name can be reused once
    its stack has finished, and the newest stack is the live one.
    """
    stacks = record.get("stacks")

    if not isinstance(stacks, list):
        return None

    found = None

    for stack in stacks:
        if not isinstance(stack, dict):
            continue
        branches = stack.get("branches")
        if not isinstance(branches, list):
            continue
        for entry in branches:
            if isinstance(entry, dict) and entry.get("branch") == branch:
                found = stack

    return found


def holds_merged(github_stack: dict[str, object]) -> bool:
    """Whether a stack, as GitHub's API returns it, holds a merged PR."""
    pull_requests = github_stack.get("pull_requests")

    if not isinstance(pull_requests, list):
        return False

    return any(isinstance(pr, dict) and pr.get("merged_at") for pr in pull_requests)


def point_record(record: dict[str, object], branch: str, stack_id: object, number: object) -> bool:
    """Set the id and number of the stack holding a branch. False if none.

    gh-stack keeps the id as a string and the number as an integer, and
    the id GitHub's API gives is the same numeric id as an integer.
    """
    if not isinstance(number, int) or not isinstance(stack_id, (int, str)):
        return False

    stack = stack_holding(record, branch)

    if stack is None:
        return False

    stack["id"] = str(stack_id)
    stack["number"] = number

    return True


def gh(args: list[str]) -> str | None:
    """Run gh and return its stdout, or None when it failed."""
    try:
        result = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as exc:
        print(f"✗ gh failed: {exc}", file=sys.stderr)
        return None
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        return None

    return result.stdout


def gh_json(args: list[str]) -> object | None:
    out = gh(args)

    if out is None:
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


def current_branch() -> str:
    result = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True)

    return result.stdout.strip() if result.returncode == 0 else ""


def open_pull_request(branch: str) -> int | None:
    """The one open pull request for a branch, or None."""
    found = gh_json(["pr", "list", "--head", branch, "--state", "open", "--json", "number"])

    if not isinstance(found, list) or len(found) != 1:
        return None

    number = found[0].get("number") if isinstance(found[0], dict) else None

    return number if isinstance(number, int) else None


def needed() -> int:
    path = record_path()
    record = read_record(path) if path is not None else None

    if record is None:
        return 1

    stack = stack_holding(record, current_branch())
    number = stack.get("number") if stack is not None else None

    if not isinstance(number, int):
        # Never submitted, so there is no stack on GitHub to refuse.
        return 1

    github_stack = gh_json(["api", f"repos/{{owner}}/{{repo}}/stacks/{number}"])

    if not isinstance(github_stack, dict):
        return 1

    return 0 if holds_merged(github_stack) else 1


def link(branches: list[str]) -> int:
    if not branches:
        print("✗ No branches to link.", file=sys.stderr)
        return 1

    numbers: list[int] = []

    for branch in branches:
        number = open_pull_request(branch)
        if number is None:
            print(
                f"✗ {branch} does not have exactly one open pull request, "
                "so the stack cannot be linked on GitHub.",
                file=sys.stderr,
            )
            return 1
        numbers.append(number)

    if len(numbers) > 1:
        # A stack is two or more pull requests: one on its own is in no
        # stack on GitHub, and there is nothing to link it to.
        if gh(["stack", "link", *[str(n) for n in numbers]]) is None:
            print("✗ gh stack link failed.", file=sys.stderr)
            return 1

    pull_request = gh_json(["api", f"repos/{{owner}}/{{repo}}/pulls/{numbers[0]}"])
    github_stack = pull_request.get("stack") if isinstance(pull_request, dict) else None

    if not isinstance(github_stack, dict):
        if len(numbers) == 1:
            print("  One open pull request: no stack on GitHub to point at.")
            return 0
        print(
            f"✗ Linked, but GitHub did not say which stack #{numbers[0]} is now in.",
            file=sys.stderr,
        )
        return 1

    path = record_path()
    record = read_record(path) if path is not None else None

    if path is None or record is None:
        print("✗ No local stack record to point at it.", file=sys.stderr)
        return 1
    if not point_record(record, branches[0], github_stack.get("id"), github_stack.get("number")):
        print(
            f"✗ The local record holds no stack for {branches[0]}, or GitHub gave no stack number.",
            file=sys.stderr,
        )
        return 1

    path.write_text(json.dumps(record, indent=2))
    print(
        f"  The local record now points at stack #{github_stack.get('number')} "
        f"on GitHub ({len(numbers)} open)."
    )

    return 0


def open_pull_requests(branches: list[str]) -> list[int] | None:
    """The open pull request for each branch, in order, or None."""
    numbers: list[int] = []

    for branch in branches:
        number = open_pull_request(branch)
        if number is None:
            print(
                f"✗ {branch} does not have exactly one open pull request.",
                file=sys.stderr,
            )
            return None
        numbers.append(number)

    return numbers


def stack_of(number: int) -> dict[str, object] | None:
    """GitHub's stack for a pull request, as its API gives it, or None."""
    pull_request = gh_json(["api", f"repos/{{owner}}/{{repo}}/pulls/{number}"])
    stack = pull_request.get("stack") if isinstance(pull_request, dict) else None

    return stack if isinstance(stack, dict) else None


def closed_unmerged(github_stack: dict[str, object]) -> list[int]:
    """The pull requests in a stack that were closed without merging."""
    pull_requests = github_stack.get("pull_requests")

    if not isinstance(pull_requests, list):
        return []

    return [
        pr["number"]
        for pr in pull_requests
        if isinstance(pr, dict)
        and pr.get("state") == "closed"
        and not pr.get("merged_at")
        and isinstance(pr.get("number"), int)
    ]


def problems(numbers: list[int]) -> list[str]:
    """What is wrong with GitHub's stack for these pull requests, in order.

    None of them in a stack, more than one stack among them, an order
    that is not theirs, or a pull request closed without merging inside
    the stack: the last is what refuses every addition after it.
    """
    if len(numbers) < 2:
        return []

    found: list[str] = []
    stacks: dict[int, list[int]] = {}
    positions: list[int] = []

    for number in numbers:
        stack = stack_of(number)
        stack_number = stack.get("number") if stack is not None else None
        position = stack.get("position") if stack is not None else None

        if not isinstance(stack_number, int):
            found.append(f"#{number} is in no stack on GitHub")
            continue
        stacks.setdefault(stack_number, []).append(number)
        if isinstance(position, int):
            positions.append(position)

    if len(stacks) > 1:
        for stack_number, members in sorted(stacks.items()):
            listed = ", ".join(f"#{n}" for n in members)
            found.append(f"stack #{stack_number} on GitHub holds {listed}")

    if len(stacks) == 1 and positions != sorted(positions):
        found.append("GitHub's stack holds them in another order")

    for stack_number in sorted(stacks):
        github_stack = gh_json(["api", f"repos/{{owner}}/{{repo}}/stacks/{stack_number}"])
        if not isinstance(github_stack, dict):
            continue
        for closed in closed_unmerged(github_stack):
            found.append(f"stack #{stack_number} on GitHub holds #{closed}, closed without merging")

    return found


def check(branches: list[str]) -> int:
    numbers = open_pull_requests(branches)

    if numbers is None:
        return 1

    found = problems(numbers)

    if not found:
        print(f"  GitHub has the {len(numbers)} open as one stack.")
        return 0

    print("✗ GitHub's stack does not match this one:", file=sys.stderr)
    for problem in found:
        print(f"    {problem}", file=sys.stderr)
    print(
        "  Run `just stack-relink` to make them one stack again.",
        file=sys.stderr,
    )

    return 1


def add_missing(numbers: list[int]) -> bool:
    """Add the pull requests GitHub left out to the stack holding the rest.

    The usual drift: `gh stack submit` opens a new pull request at the
    top and GitHub leaves it in no stack. Added to the stack that holds
    the rest, it is put back without unstacking anything, which matters
    because GitHub will not unstack a pull request queued to merge. On
    2026-10-17 twenty were queued, and this put six back one at a time.

    Only where that can work: the missing ones are all above the held
    ones, the held ones are one stack on GitHub in their order with
    nothing above the last of them, and nothing in it was closed without
    merging, which would refuse the addition.

    Returns:
        True when it applied and the link was made; whether GitHub now
        holds them all as one is for the caller to check.
    """
    held: list[tuple[int, int, int, int]] = []
    missing: list[int] = []

    for number in numbers:
        stack = stack_of(number)
        stack_number = stack.get("number") if stack is not None else None

        if not isinstance(stack_number, int):
            missing.append(number)
            continue
        if missing:
            # A held one above a missing one: a gap in the middle, which
            # adding at the top cannot close.
            return False

        position = stack.get("position") if stack is not None else None
        size = stack.get("size") if stack is not None else None
        if not isinstance(position, int) or not isinstance(size, int):
            return False
        held.append((number, stack_number, position, size))

    if not held or not missing:
        return False

    stack_numbers = {stack_number for _, stack_number, _, _ in held}
    positions = [position for _, _, position, _ in held]
    _, stack_number, top, size = held[-1]

    if len(stack_numbers) != 1 or positions != sorted(positions):
        return False
    if top != size:
        # Something else sits above the last one held.
        return False

    github_stack = gh_json(["api", f"repos/{{owner}}/{{repo}}/stacks/{stack_number}"])

    if not isinstance(github_stack, dict) or closed_unmerged(github_stack):
        return False

    # The stack's number first, then the pull requests to add: the form
    # that put them back on 2026-10-17.
    if gh(["stack", "link", str(stack_number), *map(str, missing)]) is None:
        return False

    listed = ", ".join(f"#{n}" for n in missing)
    print(f"  Added {listed} to stack #{stack_number} on GitHub.")

    return True


def repair(branches: list[str]) -> int:
    """Put back what GitHub left out, or unstack and link them as one.

    Adding the missing pull requests to the stack holding the rest is
    tried first (`add_missing`), and kept when GitHub then holds them all
    as one. Otherwise every stack holding them is unstacked, keeping the
    record, and they are linked again.

    `gh stack unstack <number>` also deletes the local record's entry
    when the stack is the one checked out here, so the record is read
    first and written back before linking. A stack GitHub will not
    unstack, because part of it has merged, is reported and left; the
    link then says whether the open pull requests could be gathered.
    """
    numbers = open_pull_requests(branches)
    path = record_path()

    if numbers is None:
        return 1

    if add_missing(numbers) and not problems(numbers):
        return 0

    if path is None:
        print("✗ No local stack record to keep.", file=sys.stderr)
        return 1

    kept = path.read_text()
    stack_numbers = set()

    for number in numbers:
        stack = stack_of(number)
        stack_number = stack.get("number") if stack is not None else None
        if isinstance(stack_number, int):
            stack_numbers.add(stack_number)

    for stack_number in sorted(stack_numbers):
        if gh(["stack", "unstack", str(stack_number)]) is None:
            print(
                f"  GitHub would not unstack #{stack_number}; leaving it.",
                file=sys.stderr,
            )
        else:
            print(f"  Unstacked #{stack_number} on GitHub.")

    path.write_text(kept)

    return link(branches)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--needed",
        action="store_true",
        help="exit 0 when GitHub's stack holds a merged pull request",
    )
    group.add_argument(
        "--link",
        nargs="+",
        metavar="BRANCH",
        help="the stack's unmerged branches, bottom to top",
    )
    group.add_argument(
        "--check",
        nargs="+",
        metavar="BRANCH",
        help="exit 0 when GitHub has these as one stack, in this order",
    )
    group.add_argument(
        "--repair",
        nargs="+",
        metavar="BRANCH",
        help=(
            "add any missing to the stack holding the rest, or unstack "
            "what holds them on GitHub and link them as one"
        ),
    )
    args = parser.parse_args()

    if args.needed:
        return needed()
    if args.check:
        return check(args.check)
    if args.repair:
        return repair(args.repair)

    return link(args.link)


if __name__ == "__main__":
    sys.exit(main())
