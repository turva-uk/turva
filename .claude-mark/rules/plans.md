---
paths:
  - "plans/**"
---

# Plan conventions

- **Filename**: `YYYY-MM-DD-<kebab-case-slug>.md`, dated the day the plan
  is created - e.g. `2026-11-16-claude-setup-port-plan.md`. End the
  slug in `-plan`.
- **Title**: a single `#` heading in sentence case, matching the slug
  (e.g. `# Claude setup port plan`).
- **Overview**: one or two paragraphs immediately under the title,
  before the first phase - explain _why_ the change is needed (the
  problem, risk, or need it addresses) and what the intended outcome
  is. Don't jump straight into tasks without this. Two paragraphs is
  the ceiling, not the target: the detail belongs in the steps, and an
  overview that grows past this is usually explaining something twice.
- **Phases**: break the work into `## Phase N: <name>` sections, each a
  checklist of concrete, actionable steps:

  ```markdown
  - [ ] Do the thing, in `path/to/file.py`
  - [x] Already-completed step
  ```

  Check items off (`- [x]`) as work completes - a plan file is a living
  record of progress, not a one-time proposal. Do not delete completed
  phases; leave them checked for history.

- **No tables.** Markdown tables are unreadable in raw form - the cells
  wrap, the columns stop lining up, and the plan can only be scanned in
  a rendered preview. Use bullets for anything a table would hold:

  ```markdown
  - **The thing** - what it is, and why it matters.
  - **The other thing** - same shape, one bullet each.
  ```

  Put the label in bold, then a spaced hyphen ( - ), then the prose.
  Never an em dash or an en dash. Separate
  bullets with a blank line when each runs to more than a line or two.

- **Decisions** (optional, include when there are non-obvious
  trade-offs): a `## Decisions` section, one bullet per decision in the
  form above. The rationale explains _why_, not just what.
- **There is no index of plans.** The folder listing, sorted by the
  date each filename opens with, is the register. Do not create one.
- Prefer reusing patterns/utilities already documented in nearby plans
  over inventing new structure - skim 1-2 recent plans for tone and
  section depth before writing a new one.

## Write it in implementation order, and keep it that way

The plan is read afterwards by somebody reconstructing what happened,
so its order is part of its content.

- **Order the phases and steps the way the work should actually be
  done**, not by topic and not by which part is easiest to describe.
  A step that must land in its own deploy, or that unblocks three
  others, belongs where its timing says it does.
- **Follow the plan in the order it is written.** If the order turns
  out to be wrong, that is a finding about the plan: **change the
  order in the document**, then carry on. Do not work out of order
  while leaving the file describing a sequence nobody followed.
- **The test**: someone reading the finished document top to bottom
  should see the work in the order it was done. If they would not,
  the document is out of date, not the memory of it.

## Write it to be built by `/f`

`/f` builds a plan unattended, one stacked branch and draft pull request
per phase, and the human is gone by the time it finds a problem. So the
plan settles what `/f` would otherwise discover mid-run.

- **One phase is one reviewable unit**: twenty to thirty minutes of a
  human reading its pull request. A phase that would need a long list
  of changes to describe is two phases; one that only tidies the phase
  before it belongs in that phase.

- **Each phase stands on the phases above it alone**, so a change of
  mind at Phase 3 does not undo Phase 1.

- **Phase 1 is safe to be on `main` on its own.** Unfinished is fine;
  unsafe is not, so feature-gate the entry point where a phase would
  expose something half-built.

- **A migration sits in the phase whose code uses it**, never in an
  earlier or later one.

- **Name anything irreversible in its step**: a destructive migration,
  a change to who can sign in or edit a safety file, a commit to a
  safety file's Git history. `/f` stops and asks before committing that
  unit, and a named step means the question can be answered before the
  run starts.

- **Keep an `## Open questions` section** whenever anything was
  undecided, one checkbox per question. An unticked box is open; a
  ticked one carries its answer beside it, and when, so the section
  stays as the record of what was decided and why. Never delete it or
  an answered question: it is what an audit reads afterwards. Where an
  answer changes a step, update the step too.

  ```markdown
  ## Open questions

  - [x] **Should the export include closed hazards?** - Yes: a reviewer
        needs to see why each was closed. Answered in `/g`, 16 November 2026.
  - [ ] **Which template does a new safety file start from?**
  ```

- **Keep a `## Before running /f` section** for anything only a human
  can do before the run: an account to create, a secret to add, a
  permission to grant. One checkbox each, ticked when done, and kept
  afterwards like the open questions.

- **`/f` will not start while a box in either section is unticked.**
  `/g` is the interview that settles them: it asks about each open
  question and anything else that could stop the run, and writes the
  answers and the human jobs into these two sections.

## Explain each step inside its own checkbox

- **Put the reasoning, research and file paths in the step itself**,
  not in a separate overview or background section that the steps then
  repeat. A reader meets each decision once, at the point it matters.
- **A step can run to a paragraph or two** where the reasoning earns
  it. Long is fine; saying the same thing in two places is not.
- **Do not pair a "what we found" section with a "what we will do"
  section** covering the same ground. That split is what makes a plan
  twice as long to read as it needs to be, and it is the most common
  failure here.
- **`## Decisions` stays separate, and does not repeat a step.** It is
  for trade-offs that span the plan or were deliberately deferred -
  the things somebody will later ask "why did you do it that way?"
  about. Where a decision belongs to one step, it lives in that step.
