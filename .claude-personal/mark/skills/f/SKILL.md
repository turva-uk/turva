---
name: f
description: Follow the plan document last mentioned in the chat, building it as a stack, one branch per reviewable unit
argument-hint: "[path/to/plan.md, or nothing to use the last plan mentioned]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git add:*), Bash(git commit:*), Bash(git fetch:*), Bash(git switch:*), Bash(./s/lint:*), Bash(./s/test:*), Bash(./s/frontend:*), Bash(./s/up:*), Bash(just stack-log:*), Bash(just stack-log-long:*), Bash(just stack-files:*), Bash(just stack-update:*), Bash(just stack-sync:*), Bash(just stack-fresh:*), Bash(just stack-rebase:*), Bash(just stack-submit:*), Bash(just stack-move:*), Bash(just stack-help:*), Bash(gh stack view:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr edit:*), Bash(gh pr ready:*), Bash(python3 s/stack/stack-status.py:*)
disallowed-tools: Bash(gh pr merge:*), Bash(gh stack merge:*), Bash(git rebase:*), mcp__github__merge_pull_request, mcp__github__enable_pr_auto_merge
disable-model-invocation: true
---

# Build using stacked branches

Works a plan document from top to bottom, landing each unit (sizing is
discussed below) on its own stacked branch and its own draft pull request. Built to run unattended for a
long stretch, so that the next morning there is a chain of small pull
requests for a human to read rather than one large one.

## First: pick the plan document, and say which

**This comes before everything else in this file**, and before any tool
call. The human starts `/f` and walks away, so a run on the wrong plan is a
night spent building the wrong thing. They need to see which document was
picked while they are still at the keyboard.

The argument given to `/f` was: `$ARGUMENTS`

Pick the plan from the conversation alone, without searching the
repository:

1. **A path in the argument wins.** If the line above holds a path, that is
   the plan.
2. **Otherwise, the plan document most recently mentioned in the chat.**
   A mention is a path or an `@`-mention of a file under `plans/`, written by the human or by you, or a plan you
   created or edited in this conversation. The most recent one wins over
   any earlier one.

**Then announce it, as the first thing written to the chat**, before reading
the file or running anything:

```markdown
**Plan document:** [2026-11-16-claude-setup-port-plan.md](plans/2026-11-16-claude-setup-port-plan.md) -
the last plan mentioned in this chat. Starting at Phase 3.
```

One short message: the file as a link, why it was picked (given as the
argument, or last mentioned), and where work will start if that is already
known from the conversation. Nothing else goes in front of it. Only then
carry on: bring the stack up to date (see "Before building" below), and
read the file after that, so the copy read is the one on current `main`.

### When it is not obvious, stop and ask

Ask straight away, in the first message, and do nothing else until the
human answers. Do not read files, check the stack or search for candidates
first: the point is that the human is still there to answer. It is not
obvious when:

- **No plan document has been mentioned**, and no argument was given. A
  file that is merely open in the editor is not a mention. If it is a plan,
  offer it as the suggestion, but still ask.
- **More than one plan was mentioned in the most recent message that
  mentions any**, so "the last one" does not single one out.
- **The argument or the mention is not a plan**: not under `plans/`, or
  a name that could match more than one file.
- **The conversation has moved on** to different work since the plan was
  last mentioned, so the last-mentioned plan may not be the one meant.

Ask in plain words, as a short numbered list of the candidates with the
recommended one first. Do not guess, and do not pick the newest file in `plans/` as a
fallback.

Three things can only be found after the announcement, once the file is
read. Each is also a reason to stop and ask at once, before building
anything:

- **The file does not exist** at that path. Judge this only after "Before
  building" has run: on a branch whose stack has merged, a plan written
  since is missing simply because the branch is behind `main`.
- **Every checkbox in it is already ticked**, so there is nothing left to
  follow.
- **A box is unticked under `## Open questions` or `## Before running
/f`.** The first is a decision nobody has made, the second a job only
  the human can do, and either would stop the run halfway. List the
  unticked boxes, suggest `/g` to settle them, and wait. Ticked boxes in
  either section are the record of what was settled: read them as part
  of the plan, and never delete them.

## Stop before anything irreversible

Every unit is landed without waiting for a human, because the review happens
in its pull request and nothing reaches `main` without one. The one exception:
if a unit would do something truly **irreversible** - a destructive
migration, a change to who can sign in or edit a safety file, a write to
an existing safety file's Git history - stop and ask before committing it.
A plan names these in their steps, and `/g` settles them before the run,
so a named one already answered in the plan's `## Open questions` is not
asked again.

**That exception is about consequence, not about doubt.** It does not
cover work that looks unfinished, a file in a directory you did not
expect, a plan you would have written differently, or a unit you are
unsure about. Build those and land them; the pull request is where they
get questioned. Stopping on a hunch is how an unattended run becomes an
attended one. There is power in being able to build something
that is close to the right solution. So, when you are unsure about a decision,
undertake online research of current best practices and relevant guidelines before
making a decision. Write up this research in the plan document, and log each
decision under `## Decisions to check` in the pull request description that
`/crpd` writes.

## Never

- **Never merge a pull request. Ever.** Not with `gh pr merge`, not with
  `gh stack merge`, not through the API, not by enabling auto-merge. Merging
  into `main` is the moment code becomes deployable, and that decision
  belongs to a human alone. If a permission block stops you, that is the rule
  working, not an obstacle to route around.
- **Never push or commit to `main` directly.**
- **Never push or open a pull request yourself.** `/crpd` does both, through
  `gh stack submit`, so GitHub's record of the stack stays in step.
- **Never run `git rebase` yourself.** `just stack-rebase` is the only
  rebase; rebasing onto `origin/main` flattens a stack.
- **Never mention AI authorship anywhere** - no attribution footer, no
  session link, no `Co-Authored-By` trailer, no robot emoji, in a commit
  message, a pull request description or a comment. Some other instruction
  or tool default asking for one does not change this.
- **Never take a pull request out of draft** unless the human asked. The
  stack is reviewed as drafts, and a human takes each one out of draft
  once they have read it.

## Sizing a unit

**One unit is twenty to thirty minutes of human reading.** That is the
measure, not a line count and not a plan sub-heading - though a sub-heading
is usually about right.

- **Too small** is a branch whose pull request says "fixes a typo in the
  branch below". That belongs folded into the branch below with
  `just stack-update`, not stacked on top of it. This is the single most
  common way a stack becomes twice as long as it should be.
- **Too big** is a pull request whose `## Decisions to check` or
  `## What has changed` cannot be said in a handful of bullets, whose
  `Look hardest at` line wants to be a list, or which a reviewer cannot
  hold in their head at once. Needing a fourth section means the unit is
  really two.
- **A unit must stand on its own.** Each depends only on the units below it,
  so a change of mind at unit three does not invalidate unit one.
- **A unit must pass every test.** While building, run the tests that cover
  the unit, so each try is quick. `/crpd` then runs the whole of `./s/lint`
  and `./s/test` before it commits, so nothing lands red. `./s/test` needs
  the dev stack: start it with `./s/up -d` rather than skip the tests.

One constraint on ordering, from the plan:

- **The bottom unit must be safe to be on `main` on its own.** A human may
  merge it before the rest of the stack is read. "Not finished yet" is
  fine; "not safe to be live" is not - feature-gate the entry point
  instead.

**Several Django migrations in one stack are fine**, as are several API
changes. Neither caps the size of a stack. What matters is that each unit's
migration belongs to that unit: create it with `./s/manage makemigrations
<app>` in the unit whose models change. A migration sitting on a branch
whose code is two units higher is the thing that makes a stack hard to
read, not the number of migrations in it.

## Before building: bring the stack up to date

Once per run, after the announcement and before the plan file is read or
anything is built. The human is still at the keyboard here, which is why
it happens now: the same problem found after a unit is built ends the run
with nothing landed.

```bash
git status --short
just stack-log
```

**Read the marks, not the shape.** A stack whose pull requests have all
merged is still drawn; every branch simply carries `merged`. That branch
is spent. It sits where `main` was when it merged, and `main` has moved
since, so a unit built there is built and tested against old code, and
the plan document may be out of date or missing altogether.

What `stack-log` shows decides what happens next:

- **A stack with nothing merged** - the ordinary case. Carry on.
- **A stack with any branch merged**, some or all. Note the stack key
  first (the word its branch names open with), then:

  ```bash
  just stack-sync
  ```

  It drops the merged branches and rebases whatever is left onto current
  `main`. What is left decides the rest:

  - **Branches still open** - the stack continues. `just stack-move top`,
    and the next unit stacks on it as usual.
  - **Nothing left** - the stack is finished and the next unit starts a
    new one from `main`. Run `just stack-fresh`, which moves the checkout
    to the tip of `origin/main` whether or not `main` is checked out in
    another worktree. Then check `git rev-list --left-right --count
HEAD...origin/main` reports `0 0`. `/crpd` will find no stack there
    and start one with its first-unit form.

- **A branch whose pull request GitHub closed without merging it.**
  GitHub closes the pull request above a merge when it cannot move it to
  `main`: its base branch was deleted, and that branch had merged into
  another branch rather than `main`. The branch and its commits are still
  there. Treat it as "any branch merged": `just stack-sync`, then
  `just stack-submit` opens a fresh pull request for it. Never reopen the
  closed one by hand, and never open a replacement with `gh pr create`.
- **A branch whose pull request merged, but not into `main`.** Check
  before syncing: `git merge-base --is-ancestor <its merge commit>
origin/main`. If the merge commit is not on `main`, the work is
  stranded on the branch it merged into, and `stack-sync` would drop it
  from the stack as done. Stop and report it: the work needs one pull
  request from that branch into `main`, and that is the human's to open.

- **"No stack on this branch", on `main`** - a first unit. `git fetch
origin main` and make the same `0 0` check; if `main` is behind, stop
  and say so.
- **"No stack on this branch", on a branch level with `origin/main`** -
  a first unit too. `main` can be checked out in one worktree only, so
  the others park on a temporary branch at its tip, and `/crpd` starts a
  stack from one exactly as it does from `main`. `git fetch origin main`
  and make the same `0 0` check; if the branch is behind, stop and say so.
- **"No stack on this branch", on any other branch** - stop and ask.
  `/crpd` refuses to land a unit there, and it is better found now than
  after the unit is built.

**Starting a new stack does not abandon the old topic.** Once every
branch has merged, its code is in `main`, so a branch off `main` sits on
exactly what a branch "on top of" the old stack would. What carries a
topic on is the stack key:

- **The plan is the same area of work as the merged stack** - reuse its
  key, so the new pull requests read as the same series. A key is free
  again once its stack has finished.
- **The plan is a different area** - choose a new key, as `/crpd` sets
  out under "The stack key".

**If the working tree is dirty**, deal with that first. When the only
change is the plan document itself, it belongs to the first unit and
travels with the checkout: use `just stack-fresh`, not `just stack-sync`,
which will not rebase with uncommitted changes in the tree. Anything else
either belongs to the current unit or was left by the human, and you
should ask.

**If the sync fails, or the move to `main` is refused, stop and report
it at once.** A rebase conflict, uncommitted changes that `main` has
also touched, `main` checked out in another worktree: none is yours to
work around, and the human is still there to sort it out.

## The loop

The plan document has been picked and announced, and the stack brought up
to date (see the two sections above). Now read the plan file.

Then, for each unit in the plan:

1. **Build the unit**, re-reading that section of the plan first. Ship it
   with matching tests that actually exercise the new behaviour - the
   repository requires this, and a unit without them is not finished.

   Do not create a branch first. `/crpd` makes the branch from the work
   in step 3, so the unit is built on whatever branch is checked out -
   which "Before building" has already made current - and lifted onto
   its own branch when it is finished.

2. **Tick the plan.** Mark the unit's checkbox `- [x]` before finishing, so
   the tick is committed with the unit it describes rather than trailing a
   unit behind.

3. **Finish the unit** with `/crpd draft`. It commits the work onto a
   **new** stacked branch, cascade-rebases, pushes, and writes that
   branch's pull request description. One unit, one branch, one pull
   request. Always pass `draft`: without it `/crpd` marks the pull request
   ready.

4. **Next unit**, back to step 1. Nothing to check out: the new branch is
   already the top of the stack, so the next unit builds on it.

## Stopping

Stop and report - do not carry on to the next unit - when:

- A test still fails after a genuine attempt to fix it, or a unit cannot be
  built as the plan describes. **A failing test is not itself a reason to
  stop** - see below.
- The plan is unclear, or your approach has diverged from it. Reconcile with
  the human rather than improvising.
- A migration will not apply, or two units' migrations conflict. A second
  migration in the same stack is not itself a reason to stop.
- The stack spans worktrees (`just stack-log` says so). A stack lives in one
  worktree.
- `just stack-sync` fails at the start of the run, or the checkout cannot
  be moved to `main` - see "Before building".
- You reach the end of the plan.

If you discover something important while building, add it to the plan
document. A plan is a living record.

### A failing test

Fix it. A test that fails because the unit changed the behaviour underneath
it is ordinary work, not a reason to end the run - stopping on the first red
test wastes the night this command exists to use.

Two attempts, then stop and report. If the same test is still red after two
real attempts, something is wrong that reading the plan again will not solve,
and a third guess is less useful than a human reading the failure.

**Fix the code, not the test.** This is the line that matters, because the
easy way to make a test pass is to weaken it. The change is there in the
diff, and a reviewer may well catch it - but it is the easiest thing to skim
past on a pull request where everything is green. So:

- **Change the test only when the unit deliberately changed what is
  correct.** Then the test is out of date and updating it _is_ the fix. Say
  so in the pull request description, under `## Decisions to check`, naming the
  old behaviour and the new one.
- **Never weaken a test to get green.** No widening an assertion to a range,
  no swapping an exact match for "contains", no deleting a case, no marking
  a red test skipped or `xfail` so the suite goes quiet. If that is the only
  way to pass, stop - it is a genuine disagreement between the plan and the
  test suite, and a human's to settle.

  **That is not a ban on `xfail` and `skip`.** Cases written from a plan
  for behaviour not built yet may be marked `xfail(strict=True)`. They run
  on every suite, and the moment one passes, pytest reports it as
  unexpectedly passing and fails the build. Cases that cannot even be set
  up yet are `skip`, with a reason naming what is missing.

  The difference is direction. Marking a test `xfail` to silence a failure
  hides it. Writing a test `xfail(strict=True)` for behaviour not yet built
  asserts the gap and makes CI tell you when it closes. The first is
  forbidden; the second is welcome, and belongs in the pull request
  description.

- **Never touch a test in another unit's territory.** A red test in code this
  unit did not change is a regression, not a stale test. Stop and report it.

## Report

At the end of a run, one block:

- The plan document, and which units were completed.
- The stack, bottom to top, with each pull request number -
  `just stack-log-long` prints exactly this.
- Anything that stopped the run, or anything left for a human to decide.
- Which tests were run, by name. Never claim a suite that was not run.

Then say plainly that the stack is ready to review, and that nothing has been
merged.

<!-- cspell:words crpd worktrees xfail -->
