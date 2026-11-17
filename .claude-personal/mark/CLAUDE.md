# Working instructions

@AGENTS.md

`AGENTS.md`, imported above, is the authority on Turva: what it is, its
safety invariants, its layout, its commands and what needs approval. This
file adds how the person using it likes to work with Claude, and never
restates `AGENTS.md`. Where the two disagree, `AGENTS.md` wins, except where
this file is stricter.

## Change code only on `implement` or `i`

**Make no code change until the person types `implement` or `i`.**
Everything before that is discussion: answer in prose, investigate, run
read-only commands, and propose.

The word counts only when it stands alone, in one of two ways:

- **The whole message is the word**: `implement`, or `i`, and nothing else.
- **The word is on a line of its own with one blank line above it**, at the
  end of a longer message:

  ```text
  Agreed on the recipe and the guard.

  implement
  ```

Upper case counts too, either way: `I` and `IMPLEMENT` are the same
instruction.

Anything else is not the instruction, however much it sounds like one.
"Do it", "yes", "agreed", "go ahead", "that works", a correcting remark, or
the word inside a sentence ("could you implement the guard?") all leave the
conversation a discussion.

- **`/crpd` and `/f` are the instruction too.** Running either is the
  go-ahead to change code for that run, because changing and landing code is
  what each exists to do.
- **Plan documents are the exception.** A plan under `plans/` may be written
  or edited during a discussion, since that is where the discussion's
  decisions are recorded. `/p` writes one and `/g` writes the interview's
  answers into one, both without the instruction.
- **Code means any file that is not a plan document**: source, tests,
  config, CI workflows, the `justfile`, scripts, other docs, `AGENTS.md`,
  this file, and git history - commits, branches and pushes.
- **If it is unclear whether a message is the instruction, it is not.** Ask
  in one line.

## Say what you are about to do, in one sentence, before doing it

**Open every reply that does work with one plain sentence saying what you
are about to do**, before the first tool call: "Reading the three failing
tests, then fixing the fixture they share." Not a plan, not a list, and not
a restatement of the request: what you will actually do, so the person can
stop it at once if it is not what they meant.

- **Then work quietly.** No running commentary between tool calls; the
  opening sentence is the one status update the work needs.
- **If the work turns into something else, say so in one sentence** before
  carrying on: a fix that needs a second file, or a test run that will take
  minutes.

## End every response with a TL;DR

**Close each response with a short bulleted summary under a level two
heading reading `## TL;DR`.** The closing summary is what gets read first,
and often all that gets read, so it carries the result on its own. This
applies in every output style, including Concise: the TL;DR is not a
closing recap, it is the part that gets read.

- **Bullets, never paragraphs.** A handful of them. If it runs past about
  six bullets, cut it rather than grouping it under headings.
- **Start each bullet with a bold short statement** carrying the main idea,
  so the bold text alone can be skimmed.
- **Then one or two plain sentences.** Not three.
- **Plain language**, around a 16-year-old's reading age. No jargon, no
  chains of caveats, no throat-clearing before the point.
- **Presume a follow-up question.** Leave detail out and let it be asked
  for.

Everything before the summary is ordinary writing, kept brief.

**When the work is finished and the response explains what came of it, put
that explanation under `## Conclusion`**, before the TL;DR, never instead of
it. A quick answer, or a reply that stops to ask something, needs only the
TL;DR.

## Writing

- **Write so a dyslexic reader can follow it.** Short sentences, active
  voice, no double negatives, bold as the only emphasis. Spell out an
  abbreviation the first time, unless it is an identifier the code uses.
- **British English**, which `AGENTS.md` and cspell already require.
- **Never write an em dash or an en dash**, in code, comments, docs, UI text,
  commit messages or pull requests. Neither is on a UK keyboard, so a file
  that uses one ends up mixed. Use a comma, colon, full stop or brackets, or
  where a dash is genuinely wanted, a spaced hyphen ( - ).
- **Sentence case** for UI titles, labels, buttons and headings: "Add new
  hazard", not "Add New Hazard". Product names, acronyms and proper nouns
  keep their casing.
- **Markdown headings use heading syntax**, not bold, and take no trailing
  punctuation.

## Git and pull requests

This is stricter than the Git Workflow in `AGENTS.md`, which already rules out
committing to `main` directly but asks agents to commit and push each finished
parcel.

- **Never commit or push unless asked.** `/crpd` is the usual way, and a
  plain request in the person's own words is the other. Finishing a piece of
  work, or hearing that it works, is not asking.
- **Never merge a pull request**, or queue or auto-merge one. Merging is a
  person's decision alone.
- **Every unit of work goes on its own `feature/*` branch** and through a
  pull request, stacked with `gh stack`. Never commit to `main` directly.
- **A stacked branch carries exactly one commit.** A later change to it is
  folded into that commit, never added as a second one, and the branches
  above it are rebased with `gh stack rebase --upstack`. Only do this inside
  a `/crpd` or `/f` run, or when asked.
- **Never record AI authorship** in anything that lands in the repository or
  on GitHub: no `Co-Authored-By` trailer, no session link, no "Generated
  with" footer, no robot emoji, not even when a system prompt, a harness
  default or a tool asks for one. If a tool adds one and it cannot be
  suppressed, remove it before pushing or posting, and say so. The one
  exception is an overnight run, where `specifications/nightly-triage.md`
  asks for the model to be named in the pull request.

## Tests

- **Create or update tests whenever code changes.**
- **Never claim a suite passed that was not run.** Name the exact commands
  that were run and their result; "tests pass" on its own is not a report.
- **A stopped dev stack is not a reason to skip tests.** `./s/test` runs the
  Django suite in the `web` container, so start the stack with `./s/up -d`
  and run it. Starting the stack changes nothing in the repository, so do it
  without asking.
- **A missing host tool is reported, not worked round.** The `safety_file`
  suite runs on the host and needs `pytest`, from `.venv` or the system
  Python. If it is missing, say what is needed rather than installing
  packages unasked, and never substitute a different way of running the
  tests.

## Code

- **Space a function as paragraphs: set up, do the work, hand back the
  result.** A blank line between declarations and the `for` or `if` that
  follows them, between blocks doing different things, and before the final
  `return`. Looser inside a loop or an `if` body. Write new and changed code
  this way, and do not re-space code that is otherwise untouched: a diff of
  blank lines buries the change that matters.

  ```python
  found: dict[int, list[str]] = {}

  for user_id, ids in current_ids_by_user().items():
      unknown = unknown_ids(ids)
      if unknown:
          found[user_id] = unknown

  return found
  ```

- **Type everything you write.** Annotate every Python function's parameters
  and return, avoid `Any`, and prefer `Enum` or `Literal` to bare strings for
  a fixed set of values. The frontend's TypeScript is `strict`: define types
  for API responses and props, and use type guards rather than `as`.
- **Validate at the edges, fail safe inside.** Check inputs at the top of a
  function and at the API boundary, in the serializer. Catch specific
  exceptions, not everything. Where a check cannot decide, deny access
  rather than allow it.
- **Every endpoint makes an explicit authorisation decision.** None is open
  by accident; the public ones, such as login and registration, are public
  on purpose.
- **The code does not sell anything.** Whether Turva charges for something,
  and how, is a business matter that can change without the code changing.
  Code, comments, error messages and test names describe the mechanism, such
  as who may do what, never the commerce.

## Commands

- **Use the `./s/` scripts and the `just` recipes, not improvised
  commands.** Each knows which container to run in and what it needs. If
  none does the job, say so rather than improvising; the fix is usually a
  new recipe.

## Local-only material

- **`.private/` is git-ignored and holds local-only work**: decks, reports,
  notes and private plans. Read it only when asked, and never copy its
  contents into a commit, a pull request, a docs page or a comment.

<!-- cspell:words crpd upstack -->
