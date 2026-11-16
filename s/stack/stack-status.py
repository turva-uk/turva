#!/usr/bin/env python3
"""Draw the current gh-stack stack, with worktree and pull request state.

`gh stack view` already draws a chain of branches. This adds the two things
it cannot know, both of which matter in this repository:

- **Which branches are checked out in another worktree.** `gh stack rebase`
  prints an error for such a branch, skips it, and still exits 0 - see
  github/gh-stack#35, reproduced here on 2026-09-14. A stack operation that
  half-runs succeeds silently, so the branches are named before anything
  runs.
- **The pull request and its checks** (`--prs` only). One `gh pr list` call
  joined onto the stack, so "is this one green yet" does not mean opening a
  browser.

Exit codes: 0 drew the stack, 1 no stack here, 2 a branch is checked out in
another worktree (`--check` only, so `just str` can refuse). `--spent` has
its own pair: 0 every branch has merged, 1 anything else.
"""

from __future__ import annotations

# cspell:ignore numstat
import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Box-drawing and status glyphs. Kept together so the drawing below reads as
# layout rather than punctuation.
GLYPH_MERGED = "✓"
GLYPH_QUEUED = "◎"
GLYPH_CURRENT = "●"
GLYPH_OPEN = "○"
GLYPH_WARN = "⚠"
PIPE = "│"
ELBOW = "└"


# ANSI colours, blanked when stdout is not a terminal so piped output stays
# plain. `--no-colour` forces the same.
class Palette:
    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled

    def _wrap(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self.enabled else text

    def dim(self, text: str) -> str:
        return self._wrap("2", text)

    def bold(self, text: str) -> str:
        return self._wrap("1", text)

    def green(self, text: str) -> str:
        return self._wrap("32", text)

    def red(self, text: str) -> str:
        return self._wrap("31", text)

    def yellow(self, text: str) -> str:
        return self._wrap("33", text)

    def bold_yellow(self, text: str) -> str:
        """Bold and yellow together, as one code.

        Not `bold(yellow(text))`: the inner reset ends every attribute
        rather than just the colour, so the bold stopped where the
        colour did and the text came out yellow but light.
        """
        return self._wrap("1;33", text)

    def blue(self, text: str) -> str:
        return self._wrap("34", text)

    def key(self, text: str) -> str:
        """A key to press: bold bright blue, as in the watch's header."""
        return self._wrap("1;94", text)

    def link(self, url: str, text: str) -> str:
        """Make *text* clickable, with *url* hidden behind it.

        OSC 8, which most terminals since about 2017 understand: the
        URL travels in an escape sequence and only the label is drawn,
        so a row keeps its width whatever the address behind it.

        Gated on the same flag as the colours, and for the same
        reason. A terminal that does not know the sequence prints it
        as rubbish, and piped output would carry escapes into whatever
        reads it next - so when stdout is not a terminal, or
        `--no-colour` was passed, this hands back the plain text.
        """
        if not self.enabled or not url:
            return text

        start = f"\033]8;;{url}\033\\"
        end = "\033]8;;\033\\"

        return f"{start}{text}{end}"


@dataclass
class Branch:
    """One layer of the stack, with everything joined onto it."""

    name: str
    is_current: bool
    is_merged: bool
    is_queued: bool
    needs_rebase: bool
    worktree: str | None = None
    pr: dict[str, object] = field(default_factory=dict)


def run(cmd: list[str], *, check: bool = True) -> str:
    """Run a command and return its stdout, or "" when it fails and may."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as exc:
        if check:
            print(f"✗ {cmd[0]} failed: {exc}", file=sys.stderr)
            raise SystemExit(1) from exc
        return ""
    if result.returncode != 0 and check:
        # gh prints its own diagnostics; passing them through is more use
        # than restating them.
        sys.stderr.write(result.stderr)
        raise SystemExit(1)

    return result.stdout if result.returncode == 0 else ""


def read_stack() -> dict[str, object] | None:
    """Parse `gh stack view --json`, or None when this branch has no stack.

    `gh stack view` exits 0 and prints a human message to stdout when the
    branch is not stacked, so the JSON parse is what distinguishes the two
    cases rather than the exit code.
    """
    raw = run(["gh", "stack", "view", "--json"], check=False)

    if not raw.strip():
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    return data if isinstance(data, dict) and data.get("branches") else None


def stack_entries(stack: dict[str, object]) -> list[dict[str, object]]:
    """Return the branch entries from parsed stack JSON, typed.

    `stack` holds `object` values because it came from `json.loads`, so
    iterating `stack["branches"]` directly does not type-check. Narrowing it
    once here keeps the two call sites free of repeated isinstance noise.
    """
    raw = stack.get("branches")

    if not isinstance(raw, list):
        return []

    return [entry for entry in raw if isinstance(entry, dict)]


def spent_branches(stack: dict[str, object] | None) -> list[str] | None:
    """The branches of a stack with nothing left to land, or None.

    A stack is spent when every branch in it has merged. None covers the
    rest: no stack here, or one with a branch still open, which is a
    stack somebody is working on however many of its others have landed.
    """
    if stack is None:
        return None

    entries = stack_entries(stack)

    if not entries or not all(entry.get("isMerged") for entry in entries):
        return None

    return [str(entry.get("name", "")) for entry in entries]


def left_behind_branches(stack: dict[str, object] | None) -> list[str]:
    """The open branches `gh stack rebase` should have rebased and did not.

    `needsRebase` alone over-reports while a pull request is in the merge
    queue. `gh stack rebase` leaves a queued branch where it is, since
    rebasing it would take it out of the queue, and so it stays behind
    trunk; every branch above it then reads `needsRebase` too, because
    the line it sits on is behind. Neither is a branch the rebase skipped
    by mistake. Seen on 26 October 2026, when `stack-submit` refused to
    push a branch sitting exactly on a queued #2203.

    So a queued branch is excused, and so is a branch above one whose
    `base` is the tip of the open branch below it: it is where the rebase
    put it. Anything else flagged is a real skip.
    """
    if stack is None:
        return []

    found: list[str] = []
    below: dict[str, object] | None = None
    above_queued = False

    for entry in stack_entries(stack):
        if entry.get("isMerged"):
            continue

        name = str(entry.get("name", ""))

        if entry.get("isQueued"):
            above_queued = True
        elif entry.get("needsRebase"):
            on_its_parent = (
                above_queued and below is not None and entry.get("base") == below.get("head")
            )
            if not on_its_parent:
                found.append(name)

        below = entry

    return found


def read_worktrees() -> dict[str, str]:
    """Map branch name to the worktree checking it out, excluding this one.

    Only branches held by *another* worktree matter: a branch checked out
    here is the ordinary case and blocks nothing.
    """
    porcelain = run(["git", "worktree", "list", "--porcelain"], check=False)
    here = Path.cwd().resolve()
    occupied: dict[str, str] = {}
    path: Path | None = None

    for line in porcelain.splitlines():
        if line.startswith("worktree "):
            path = Path(line.split(" ", 1)[1]).resolve()
        elif line.startswith("branch ") and path is not None:
            branch = line.split(" ", 1)[1].removeprefix("refs/heads/")
            if path != here:
                occupied[branch] = path.name

    return occupied


def read_pull_requests(branches: list[str]) -> dict[str, dict[str, object]]:
    """Join open and recently merged pull requests onto the stack branches.

    One `gh pr list` call rather than one `gh pr view` per branch: a
    six-deep stack would otherwise be six round trips. Checks come back in
    the same response via statusCheckRollup.
    """
    # `--state open` and a small limit, deliberately. Asking for
    # statusCheckRollup across 60 pull requests makes one GraphQL query large
    # enough that GitHub answers HTTP 504, and the empty result then rendered
    # as "no pull request" against every branch - a wrong answer that looked
    # like an answer. A stack's branches are open by definition; a merged one
    # is reported by `isMerged` in the stack data itself.
    # Ask for every open pull request, not a guessed ceiling. At a flat 30,
    # a repository with 69 open returned only the newest; a stack's branches
    # are all older than those, so every branch drew as "no pull request" -
    # which reads as "none opened yet" rather than "the list was cut short",
    # and the CI columns went blank with it, statusCheckRollup riding in the
    # same response. Sizing it from the stack was no better: 15 branches
    # asked for 60 and still missed the oldest nine.
    #
    # `--limit` needs a number, so the count comes first, in a cheap call
    # that asks for one field and no check state. Falling back to a large
    # constant keeps the drawing working if that call fails.
    counted = run(
        [
            "gh",
            "pr",
            "list",
            "--state",
            "open",
            "--limit",
            "500",
            "--json",
            "number",
        ],
        check=False,
    )

    try:
        limit = max(len(json.loads(counted)), 30)
    except json.JSONDecodeError, TypeError:
        limit = 200

    raw = run(
        [
            "gh",
            "pr",
            "list",
            "--state",
            "open",
            "--limit",
            str(limit),
            "--json",
            "number,headRefName,isDraft,mergeable,state,statusCheckRollup,url",
        ],
        check=False,
    )

    if not raw.strip():
        # Say so rather than returning silently: every branch would otherwise
        # be labelled "no pull request", which is indistinguishable from the
        # truth and is how this went unnoticed for two runs.
        print(
            "  ⚠ Could not read pull requests from GitHub - showing the stack without them.",
            file=sys.stderr,
        )
        return {}
    try:
        pull_requests = json.loads(raw)
    except json.JSONDecodeError:
        print(
            "  ⚠ Unreadable response from `gh pr list` - showing the stack without pull requests.",
            file=sys.stderr,
        )
        return {}

    wanted = set(branches)
    found: dict[str, dict[str, object]] = {}

    for pr in pull_requests:
        head = pr.get("headRefName")
        # First match wins: `gh pr list` returns newest first, so a branch
        # reused across pull requests shows its current one.
        if head in wanted and head not in found:
            found[head] = pr

    return found


PASSING = frozenset({"SUCCESS", "SKIPPED", "NEUTRAL"})
FAILING = frozenset({"FAILURE", "ERROR", "TIMED_OUT", "CANCELLED"})
PENDING = frozenset({"QUEUED", "IN_PROGRESS", "PENDING", "WAITING"})


def run_id_of(check: dict[str, object]) -> str | None:
    """The id of the workflow run a check belongs to, or None.

    Read from ``detailsUrl``, which for a check from GitHub Actions is
    ``…/actions/runs/<run id>/job/<job id>``. A check from anywhere else,
    or a roll-up with no URL in it, has no run to belong to.
    """
    url = str(check.get("detailsUrl") or "")
    _, marker, rest = url.partition("/actions/runs/")

    if not marker:
        return None

    run_id = rest.split("/", 1)[0]

    return run_id if run_id.isdecimal() else None


def cancelled_runs(rollup: list[object]) -> set[str]:
    """The runs in which any check was cancelled.

    A run CI's concurrency rule cancelled in favour of a newer one. Not
    every check in such a run says CANCELLED. A job that only sums up
    others, such as one over a matrix of legs, was never cancelled itself:
    it ran, found its legs had not passed, and reported FAILURE. That is a
    failure of a run GitHub no longer shows.
    """
    return {
        run_id
        for check in rollup
        if isinstance(check, dict)
        and str(check.get("conclusion") or "") == "CANCELLED"
        and (run_id := run_id_of(check)) is not None
    }


def best_conclusion_per_check(
    rollup: list[object],
) -> dict[str, tuple[str, str]]:
    """Reduce the roll-up to one status and conclusion per check name.

    A check name appears more than once when it ran more than once on the
    same head, and a job gated on a condition can carry both SKIPPED and
    SUCCESS. Taking the last, or the worst, could report such a job as
    skipped forever. The best
    outcome per name is the true one - a job that has succeeded once on
    this head has succeeded.
    """
    # Ranked so the most important outcome for the same name wins, which is
    # not the same as the best one:
    #
    # - **failing** beats everything. A job that failed on this head has
    #   failed, whatever a sibling entry says.
    # - **pending** beats both finished states. A name with a run still in
    #   flight is not settled, and reporting it as passed - which ranking
    #   pending below passing did - showed a tick while a job was
    #   visibly still running.
    # - **passing** beats **skipped**, because a job that actually ran and
    #   passed is the truer account of the same name than a run that
    #   skipped it. Ranking those two equal reported such a job as skipped
    #   even after it had run.
    rank = {
        "skipped": 0,
        "passing": 1,
        "pending": 2,
        "failing": 3,
    }
    dead_runs = cancelled_runs(rollup)
    # (kind, conclusion, whether it came from a cancelled run)
    seen: dict[str, list[tuple[str, str, bool]]] = {}

    for check in rollup:
        if not isinstance(check, dict):
            continue
        name = str(check.get("name") or check.get("context") or "")
        if not name:
            continue
        status = str(check.get("status") or "")
        conclusion = str(check.get("conclusion") or check.get("state") or "")

        if status in PENDING:
            kind = "pending"
        elif conclusion == "SKIPPED":
            kind = "skipped"
        elif conclusion in PASSING:
            kind = "passing"
        elif conclusion in FAILING:
            kind = "failing"
        else:
            kind = "pending"

        from_dead_run = run_id_of(check) in dead_runs
        seen.setdefault(name, []).append((kind, conclusion, from_dead_run))

    best: dict[str, tuple[str, str]] = {}

    for name, entries in seen.items():
        # A cancelled copy beside any other copy of the same check is a
        # superseded run: two pushes a second apart start two runs, and
        # CI's concurrency rule cancels the older. GitHub hides that run,
        # so counting it as a failure showed ✗ on a pull request whose
        # real run was still going. A cancellation with nothing to replace
        # it is still a failure, since GitHub reads a cancelled required
        # check as one.
        #
        # The same goes for anything else a cancelled run reported, when
        # another run has reported the same check: see `cancelled_runs`.
        # A FAILURE left behind by a dead run would show ✗ on a pull
        # request that is green on GitHub. Where no other
        # run has reported the check, what the dead run said still stands.
        replaced = [e for e in entries if e[1] != "CANCELLED" and not e[2]]
        for kind, conclusion, _ in replaced or entries:
            previous = best.get(name)
            if previous is None or rank[kind] > rank[previous[0]]:
                best[name] = (kind, conclusion)

    return best


def summarise_checks(pr: dict[str, object], palette: Palette) -> str:
    """Report the pull request's checks as one mark.

    Every job in Turva's CI runs on every push, draft or not, so one mark
    answers "is this one green yet": ✗ failing, ● still running, ✓ passed,
    and - when every job skipped.
    """
    rollup = pr.get("statusCheckRollup") or []

    if not isinstance(rollup, list) or not rollup:
        return palette.dim("no checks")

    best = best_conclusion_per_check(rollup)
    kinds = {kind for kind, _ in best.values()}

    if "failing" in kinds:
        return palette.red("✗")

    # Green like the tick: a run still going is not a problem, and only ✗
    # should draw the eye.
    if "pending" in kinds:
        return palette.green("●")

    # Every job skipped means nothing has run. Say so rather than showing a
    # tick nobody earned. One job having actually run is enough to call it a
    # pass, since the rest skipped on their own conditions.
    if kinds == {"skipped"}:
        return palette.green("-")

    return palette.green("✓")


def conflict_mark(pr: dict[str, object], palette: Palette) -> str | None:
    """Say "conflict" when GitHub cannot merge the pull request as it is.

    The two check marks cannot show this: a branch can pass every check
    and still conflict with the branch beneath it. GitHub works out
    ``mergeable`` only when somebody asks, and answers ``UNKNOWN`` until
    it has, which is common just after a push or a merge to ``main``.
    That shows nothing rather than a guess: the next redraw, a minute
    later, usually has the answer, and asking is what sets GitHub
    working on it.
    """
    if pr.get("mergeable") != "CONFLICTING":
        return None

    return palette.red("conflict")


def build_branches(
    stack: dict[str, object],
    occupied: dict[str, str],
    pull_requests: dict[str, dict[str, object]],
) -> list[Branch]:
    """Assemble the branch list, top of stack first."""
    branches = [
        Branch(
            name=str(entry.get("name", "")),
            is_current=bool(entry.get("isCurrent")),
            is_merged=bool(entry.get("isMerged")),
            is_queued=bool(entry.get("isQueued")),
            needs_rebase=bool(entry.get("needsRebase")),
            worktree=occupied.get(str(entry.get("name", ""))),
            pr=pull_requests.get(str(entry.get("name", "")), {}),
        )
        for entry in stack_entries(stack)
    ]
    # gh reports bottom-to-top; drawn top-down so the trunk sits at the
    # foot, matching `gh stack view` and how a stack is talked about.
    branches.reverse()

    return branches


def number_branches(branches: list[Branch]) -> dict[str, int]:
    """Give each branch still open a number, 1 at the bottom of the stack.

    Counted from the bottom because that end stays put: a new branch goes
    on top and takes the next number, where counting from the top would
    renumber every branch each time one was added. Merged branches get
    none, as there is nothing to go back to on them.
    """
    numbers: dict[str, int] = {}

    # `branches` is top-first, so the bottom is at the end.
    for branch in reversed(branches):
        if branch.is_merged or not branch.name:
            continue
        numbers[branch.name] = len(numbers) + 1

    return numbers


def draw(
    branches: list[Branch],
    trunk: str,
    palette: Palette,
    show_prs: bool,
    hide_merged: bool = False,
    numbered: bool = False,
    expanded: tuple[str, list[str]] | None = None,
) -> None:
    """Print the stack.

    `expanded` is a branch's name and the lines to draw under it, its
    changed files, for the watch's `e` key.

    `hide_merged` drops the branches that have already landed. They are
    kept by default because "what has gone in" is worth seeing, but a
    long-lived stack accumulates them - five merged against ten live, on
    2026-09-19 - and the part still being worked on is what a watch loop
    is for. The count is still reported, so nothing disappears silently.

    `numbered` puts each open branch's number before its name, in the
    colour the watch gives its keys, because there it is one: pressing
    the digit checks that branch out.
    """
    print()
    numbers = number_branches(branches) if numbered else {}
    merged_hidden = 0

    for branch in branches:
        if hide_merged and branch.is_merged:
            merged_hidden += 1
            continue
        if branch.is_merged:
            glyph = palette.green(GLYPH_MERGED)
        elif branch.is_queued:
            glyph = palette.blue(GLYPH_QUEUED)
        elif branch.is_current:
            glyph = palette.bold(GLYPH_CURRENT)
        else:
            glyph = GLYPH_OPEN

        # The branch you are on is bold and yellow, and so is the rest
        # of its row. It used to be bold with "← you are here" after it,
        # which was the longest thing on the line for the least in it -
        # the colour says the same and says it at a glance.
        current = branch.is_current
        name = palette.bold_yellow(branch.name) if current else branch.name

        cells: list[str] = []
        if show_prs and branch.pr:
            number = branch.pr.get("number")
            state = str(branch.pr.get("state", ""))
            # The number carries the link rather than the branch name:
            # it is already a reference to the pull request, and it is
            # short enough that a reader can tell what they are about
            # to open. The state word rides along inside the link so
            # the whole cell is one target rather than a two-character
            # one.
            url = str(branch.pr.get("url", ""))

            # An open pull request is just its number, draft or not. It
            # used to read "ready", meaning out of draft - but bare
            # "ready" sounds like a verdict on the code, which this
            # cannot know. "draft" went too, to keep the row short.
            # Merged and closed stay, because no mark carries those.
            if state == "MERGED":
                text = f"#{number} merged"
            elif state == "CLOSED":
                text = f"#{number} closed"
            else:
                text = f"#{number}"

            # On the current row the state colour gives way to the
            # yellow: two colours in one cell would make one row look
            # like two things. The words are the same either way - the
            # colour says where you are, not what the state is.
            if current:
                label = palette.bold_yellow(text)
            elif state == "MERGED":
                label = palette.green(text)
            elif state == "CLOSED":
                label = palette.red(text)
            elif branch.pr.get("isDraft"):
                label = palette.dim(text)
            else:
                label = text
            cells.append(palette.link(url, label))
            cells.append(summarise_checks(branch.pr, palette))

            conflict = conflict_mark(branch.pr, palette)
            if conflict:
                cells.append(conflict)
        elif show_prs and branch.is_merged:
            # A merged branch has no *open* pull request, which is what the
            # listing asks for - but "no pull request" then reads as "you
            # never opened one", the opposite of what happened. The stack
            # data still knows it merged, so say that.
            cells.append(palette.green("merged"))
        elif show_prs:
            cells.append(palette.dim("no pull request"))

        if branch.is_merged and not show_prs:
            cells.append(palette.green("merged"))

        suffix = "   ".join(cells)
        if numbered:
            # Every row keeps the column, numbered or not and one digit
            # or two, so the names line up. Padded before colouring: the
            # escape codes would otherwise count towards the width.
            width = len(str(len(numbers))) if numbers else 1
            number = numbers.get(branch.name)
            tag = str(number).rjust(width) if number else " " * width
            line = f"  {glyph} {palette.key(tag)} {name}"
        else:
            line = f"  {glyph} {name}"
        if suffix:
            line = f"{line}   {suffix}"
        print(line)

        notes: list[str] = []
        if branch.needs_rebase:
            notes.append(palette.yellow(f"{GLYPH_WARN} needs rebase"))
        if branch.worktree:
            held = f"{GLYPH_WARN} checked out in {branch.worktree}"
            notes.append(palette.yellow(held))
        for note in notes:
            print(f"  {PIPE}   {note}")

        if expanded and expanded[0] == branch.name:
            for detail in expanded[1]:
                print(f"  {PIPE}     {detail}")

        print(f"  {PIPE}")

    if merged_hidden:
        # Named on the trunk line rather than as a separate note: they
        # merged into it, so that is where they went.
        landed = "branch" if merged_hidden == 1 else "branches"
        print(
            f"  {ELBOW}─ {palette.dim(trunk)}   "
            + palette.green(f"+{merged_hidden} merged {landed}")
        )
    else:
        print(f"  {ELBOW}─ {palette.dim(trunk)}")
    print()


def draw_files(
    stack: dict[str, object],
    occupied: dict[str, str],
    palette: Palette,
    patch: bool,
) -> None:
    """List what each branch changes, against its own parent.

    The parent, not the trunk: that is what makes a stack reviewable. A
    branch three layers up diffed against `main` replays everything below
    it, while diffed against its parent it shows only the unit it adds.
    `base` in the stack JSON is the parent commit, so it is exactly the
    left-hand side wanted here.
    """
    entries = stack_entries(stack)
    print()
    for entry in entries:
        name = str(entry.get("name", ""))
        base = str(entry.get("base", ""))
        if not name or not base:
            continue

        marker = GLYPH_CURRENT if entry.get("isCurrent") else GLYPH_OPEN
        heading = palette.bold(name) if entry.get("isCurrent") else name
        print(f"  {marker} {heading}")

        held = occupied.get(name)
        if held:
            note = f"{GLYPH_WARN} checked out in {held}"
            print(f"      {palette.yellow(note)}")

        # --stat for the summary, or the full patch when asked. Both are
        # plain git, so the output is what any other review tool shows.
        args = ["git", "diff", "--stat" if not patch else "--patch"]
        body = run([*args, f"{base}..{name}"], check=False)
        text = body.rstrip("\n")
        if not text:
            print(f"      {palette.dim('no changes')}")
        else:
            for line in text.split("\n"):
                print(f"      {line}")
        print()

    print(f"  {ELBOW}─ {palette.dim(str(stack.get('trunk', 'main')))}")
    print()


@dataclass(frozen=True)
class ChangedFile:
    """One file a branch changes, as `git diff` reports it.

    `added` and `removed` are None for a binary file, whose lines git
    does not count. `old_path` is set only for a rename.
    """

    status: str
    path: str
    added: int | None
    removed: int | None
    old_path: str | None = None


def changed_files(base: str, branch: str) -> list[ChangedFile]:
    """What *branch* changes against *base*, its parent, file by file.

    Two git calls, both with `-z` so a path with a space or a tab in it
    comes back whole: `--name-status` for the letter, `--numstat` for
    the counts. Both with `-M`, so a renamed file is one line, not a
    deletion and an addition.
    """
    span = f"{base}..{branch}"
    statuses = run(["git", "diff", "-z", "-M", "--name-status", span], check=False).split("\0")
    counts_raw = run(["git", "diff", "-z", "-M", "--numstat", span], check=False).split("\0")

    # --numstat -z: "added<TAB>removed<TAB>path", or for a rename
    # "added<TAB>removed<TAB>" followed by the old and new paths as the
    # next two fields. "-" counts mean a binary file.
    counts: dict[str, tuple[int | None, int | None]] = {}
    index = 0

    while index < len(counts_raw) and counts_raw[index]:
        added_text, removed_text, path = counts_raw[index].split("\t", 2)
        if not path:
            path = counts_raw[index + 2]
            index += 2
        counts[path] = (
            int(added_text) if added_text != "-" else None,
            int(removed_text) if removed_text != "-" else None,
        )
        index += 1

    # --name-status -z: a status, then one path, or two for a rename or
    # a copy (R100, C75), each its own field.
    files: list[ChangedFile] = []
    index = 0

    while index < len(statuses) and statuses[index]:
        status = statuses[index]
        letter = status[0]
        if letter in ("R", "C"):
            old_path, path = statuses[index + 1], statuses[index + 2]
            index += 3
        else:
            old_path, path = None, statuses[index + 1]
            index += 2
        added, removed = counts.get(path, (None, None))
        files.append(ChangedFile(letter, path, added, removed, old_path))

    return files


def diff_folder() -> Path:
    """Where the watch keeps the parent's copy of a picked file.

    `~/.cache/stack-watch/<worktree>/`: one folder per worktree, so two
    watches never share one, and in the home folder rather than `/tmp`,
    so nobody else on the machine can read a copy. Only one branch is
    expanded at a time, so the branch is not in it.
    """
    top = run(["git", "rev-parse", "--show-toplevel"]).strip()

    return Path.home() / ".cache" / "stack-watch" / Path(top).name


def diff_sides(base: str, changed: ChangedFile, number: int) -> tuple[Path, Path]:
    """The two files `code --diff` opens for one changed file.

    The left is the parent's copy, written out from `git show` because
    the editor wants a file and the parent's version is not one. It is
    named for the file's place in the list, `3-parent-api.ts`, so two
    files of one name stay apart. A new file has an empty left side, and
    a rename's comes from the old name.

    The right is the working file itself, not a copy: the branch is the
    one checked out, since the watch expands the current branch, and a
    live right side means a slip seen while reading can be fixed in the
    same editor. A deleted file has no working file, so its right side
    is an empty file beside the copy.

    The copy is written as bytes, not text, so a binary file comes
    through whole.
    """
    folder = diff_folder()
    folder.mkdir(parents=True, exist_ok=True)
    top = Path(run(["git", "rev-parse", "--show-toplevel"]).strip())
    old_path = changed.old_path or changed.path

    left = folder / f"{number}-parent-{Path(old_path).name}"
    if changed.status == "A":
        left.write_bytes(b"")
    else:
        shown = subprocess.run(
            ["git", "show", f"{base}:{old_path}"],
            capture_output=True,
            timeout=30,
        )
        left.write_bytes(shown.stdout)

    if changed.status == "D":
        right = folder / f"{number}-deleted-{Path(changed.path).name}"
        right.write_bytes(b"")
    else:
        right = top / changed.path

    return left, right


def expanded_lines(files: list[ChangedFile], palette: Palette) -> list[str]:
    """One line per changed file, numbered for the watch's digits.

    The number is in the key colour, as the branch numbers are, because
    while the list is on screen a digit picks a file rather than a
    branch. Padded to the width of the longest, so ten and up keep the
    letters in a column.

    The letter is git's own (A added, M modified, D deleted, R renamed,
    C copied), coloured where colour says something: green for a new
    file, red for a deleted one.
    """
    if not files:
        return [palette.dim("no changes")]

    lines: list[str] = []
    width = len(str(len(files)))

    for number, changed in enumerate(files, start=1):
        if changed.status == "A":
            letter = palette.green(changed.status)
        elif changed.status == "D":
            letter = palette.red(changed.status)
        else:
            letter = changed.status

        name = changed.path
        if changed.old_path:
            name = f"{changed.old_path} → {name}"

        if changed.added is None or changed.removed is None:
            counts = palette.dim("binary")
        else:
            counts = palette.green(f"+{changed.added}") + " " + palette.red(f"-{changed.removed}")

        tag = palette.key(str(number).rjust(width))
        lines.append(f"{tag} {letter} {name}   {counts}")

    return lines


def draw_no_stack(palette: Palette) -> None:
    """Say what to run when the branch checked out is in no stack.

    Bare `gh stack init`, which this used to suggest, is the one command
    here that should not be run by hand: it skips the `feature/` prefix
    branch protection requires, the worktree guard, and the redraw that
    makes the result legible. So the advice is this repository's own
    recipes and the skill that wraps them, in the order someone reading
    this message needs them - check out a stack that already exists
    before starting a second one for the same work.
    """
    branch = run(["git", "branch", "--show-current"], check=False).strip()
    where = f" ({branch})" if branch else ""

    # Command, alias, what it does. Aligned on the widest command, which
    # is not known until the list is read - hence the two passes.
    recipes = [
        ("just stack-checkout", "stc", "check out an existing stack"),
        ("just stack-fresh", "stfr", "move to main, carrying your work"),
        ('just stack-new <name> "<message>"', "stn", "start one, from main"),
        ("just stack-help", "sth", "list every stack recipe"),
    ]
    widest = max(len(command) for command, _, _ in recipes)

    print(file=sys.stderr)
    print(f"  No stack on this branch{where}.", file=sys.stderr)
    print(file=sys.stderr)
    for command, alias, description in recipes:
        # Padded on the command's own length, never on the coloured
        # version: the escape sequences take width in the string and none
        # on the screen, so padding that would leave every line short by
        # a different amount.
        padding = " " * (widest - len(command))
        print(
            f"    {palette.bold(command)}{padding}   {palette.dim('j ' + alias)}   {description}",
            file=sys.stderr,
        )
    print(file=sys.stderr)
    print(
        "  /crpd does a whole unit in one step: new branch, commit,\n"
        "  rebase, push and a described draft pull request.",
        file=sys.stderr,
    )
    print(file=sys.stderr)


def report_blockers(branches: list[Branch], palette: Palette) -> bool:
    """Name branches held by another worktree. True when any were found."""
    blocked = [b for b in branches if b.worktree]

    if not blocked:
        return False

    count = len(blocked)
    noun = "branch is" if count == 1 else "branches are"
    print(
        palette.yellow(f"  {GLYPH_WARN} {count} stack {noun} checked out in another worktree:"),
        file=sys.stderr,
    )
    for branch in blocked:
        print(f"      {branch.name} → {branch.worktree}", file=sys.stderr)
    print(file=sys.stderr)
    print(
        "    gh stack rebase prints an error for these, skips them, and\n"
        "    still exits 0 (github/gh-stack#35), leaving the stack\n"
        "    inconsistent. A stack lives in one worktree here.",
        file=sys.stderr,
    )
    print(file=sys.stderr)

    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Draw the current stack with worktree and PR state."
    )
    parser.add_argument(
        "--prs",
        action="store_true",
        help="join pull request and CI state from GitHub (one network call)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit 2 if a stack branch is checked out in another worktree",
    )
    parser.add_argument(
        "--files",
        action="store_true",
        help="list what each branch changes against its own parent",
    )
    parser.add_argument(
        "--patch",
        action="store_true",
        help="with --files, show the full diff rather than a summary",
    )
    parser.add_argument(
        "--expand",
        metavar="BRANCH",
        help=(
            "list what BRANCH changes against its parent, under it, each "
            "file numbered for --diff-at"
        ),
    )
    parser.add_argument(
        "--diff-at",
        type=int,
        metavar="N",
        help=(
            "with --expand, print the two paths `code --diff` opens for "
            "file N: the parent's copy, then the working file"
        ),
    )
    parser.add_argument(
        "--hide-merged",
        action="store_true",
        help="leave out branches that have already merged",
    )
    parser.add_argument(
        "--rebuild-order",
        action="store_true",
        help=(
            "print this stack's unmerged branches, bottom to top, one per "
            "line, for `gh stack init` to adopt them again"
        ),
    )
    parser.add_argument(
        "--spent",
        action="store_true",
        help=(
            "print this stack's branches and exit 0 when every one has "
            "merged, exit 1 otherwise, for `just stack-sync` to clear it"
        ),
    )
    parser.add_argument(
        "--left-behind",
        action="store_true",
        help=(
            "print the open branches a rebase should have moved and did "
            "not, one per line, and exit 1 if there are any, for `just "
            "stack-rebase` to check its own result"
        ),
    )
    parser.add_argument(
        "--numbered",
        action="store_true",
        help="number the open branches, 1 at the bottom, for --branch-at",
    )
    parser.add_argument(
        "--branch-at",
        type=int,
        metavar="N",
        help="print the name of the branch --numbered draws as N",
    )
    parser.add_argument("--no-colour", action="store_true", help="disable ANSI colour")
    parser.add_argument(
        "--colour",
        action="store_true",
        help="force ANSI colour even when stdout is not a terminal",
    )
    args = parser.parse_args()

    # `--colour` forces it on for a caller that captures the output and
    # prints it itself - `just stack-watch` does exactly that, to fetch the
    # new stack before clearing the screen rather than after. Without it the
    # capture looks like a pipe and the colour is dropped.
    coloured = args.colour or sys.stdout.isatty()
    palette = Palette(coloured and not args.no_colour)

    stack = read_stack()

    if args.spent:
        # Asked before the "no stack" message below, which is advice for
        # somebody reading the screen and not for a recipe asking a
        # question.
        spent = spent_branches(stack)
        if spent is None:
            return 1
        for name in spent:
            if name:
                print(name)
        return 0

    if args.left_behind:
        # Asked before the "no stack" message, like --spent: a recipe is
        # asking, not a person reading.
        left_behind = left_behind_branches(stack)
        for name in left_behind:
            print(name)
        return 1 if left_behind else 0

    if stack is None:
        draw_no_stack(palette)
        return 1

    if args.rebuild_order:
        # `just stack-refresh` rebuilds the record by removing it and
        # adopting the branches again, so it needs them in the order
        # `gh stack init` expects: bottom first, merged ones left out
        # because they are no longer part of the stack to rebuild.
        for entry in stack_entries(stack):
            if entry.get("isMerged"):
                continue
            name = str(entry.get("name", ""))
            if name:
                print(name)
        return 0

    occupied = read_worktrees()
    branch_names = [str(entry.get("name", "")) for entry in stack_entries(stack)]
    pull_requests = read_pull_requests(branch_names) if args.prs else {}
    branches = build_branches(stack, occupied, pull_requests)
    trunk = str(stack.get("trunk", "main"))

    if args.branch_at is not None:
        # For `just stack-move <number>`: the name only, so the recipe can
        # hand it to git. Exit 1 when no branch carries that number.
        for name, number in number_branches(branches).items():
            if number == args.branch_at:
                print(name)
                return 0
        return 1

    # A branch not in the stack expands nothing, rather than failing:
    # the watch asks for the branch checked out, which may have just
    # left the stack.
    expanded: tuple[str, list[str]] | None = None
    expanded_files: list[ChangedFile] = []
    expanded_base = ""

    for entry in stack_entries(stack) if args.expand else []:
        name = str(entry.get("name", ""))
        base = str(entry.get("base", ""))
        if name == args.expand and base:
            expanded_files = changed_files(base, name)
            expanded_base = base
            expanded = (name, expanded_lines(expanded_files, palette))

    if args.diff_at is not None:
        # For the watch's digits while the list is on screen: the two
        # paths only, one per line, for `code --diff`. Exit 1 when no file
        # carries that number, as --branch-at does for a branch.
        if not 1 <= args.diff_at <= len(expanded_files):
            return 1
        picked = expanded_files[args.diff_at - 1]
        for side in diff_sides(expanded_base, picked, args.diff_at):
            print(side)
        return 0

    if args.files:
        draw_files(stack, occupied, palette, patch=args.patch)
    elif not args.check:
        draw(
            branches,
            trunk,
            palette,
            show_prs=args.prs,
            hide_merged=args.hide_merged,
            numbered=args.numbered,
            expanded=expanded,
        )
        # The drawing goes to stdout and the warning to stderr; flushing
        # between them keeps the warning under the stack it refers to
        # rather than above it when both land on a terminal.
        sys.stdout.flush()

    blocked = report_blockers(branches, palette)

    return 2 if (blocked and args.check) else 0


if __name__ == "__main__":
    sys.exit(main())
