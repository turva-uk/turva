---
name: g
description: Grill me - interview the person who ran it on a finished plan document, through the question dialog, until nothing could stop /f running it unattended
argument-hint: "[path/to/plan.md, or nothing to use the last plan mentioned]"
disable-model-invocation: true
---

# Grill me on the plan

Run this when the plan has been talked through and the person who ran it
can think of nothing else. It comes after `/p` and the fine-tuning that follows
it, and before `/f`. Its job is to find everything you are not
completely sure about, and everything that could stop `/f` running the
plan to the end unattended, and to settle each one with them while they are
still at the keyboard.

This is discussion, not implementation. Change no file except the plan
document itself, in `plans/`.

## First: pick the plan, and say which

Pick it the same way `/f` does, from the conversation alone:

1. **A path in the argument wins.** The argument was: `$ARGUMENTS`
2. **Otherwise, the plan most recently mentioned in the chat**, or the
   one you wrote or edited in this conversation.

Say which, in one line, before anything else. If no plan was mentioned,
or more than one could be meant, ask which with the question dialog and
do nothing else until they answer.

## Find what needs asking

Read the whole plan, `.claude/rules/plans.md`, and the code each phase
touches. Then list everything that is not settled. Look for:

- **Every unticked box under `## Open questions`.**
- **A step you would have to guess at**: two reasonable readings, a
  value not given, a name not chosen, behaviour the plan does not
  describe for an edge case.
- **A choice the plan states without a reason** where the other choice
  is just as plausible.
- **Anything irreversible**: a destructive migration, a change to who
  can sign in or who can edit a safety file, data deleted or moved, or
  anything that writes to existing safety files' Git history, which is
  append-only and is never rewritten. `/f` would stop before committing
  it, so agree it now.
- **Anything that changes Turva's own safety case**: a new or changed
  hazard in `SAFETY.md`, or a change to how risk level is derived from
  severity and likelihood. Severity and likelihood are a Clinical Safety
  Officer's judgement, so the plan records who decides them, not a value
  the run chooses.
- **Anything outside the repository**: an account, a secret, an API
  key, a permission, a paid service, a DNS record, a setting in a
  console. These are the human's jobs, and they go in the checklist.
- **Anything that needs a person partway through**: a manual check, a
  sign-off, a migration or a setting applied by hand between phases.
- **A phase too big for one pull request**, or one too small to stand
  alone.
- **Tests that cannot run here**, for want of a service or a fixture.
  The Django tests need the dev stack running; the `safety_file` tests
  need only Git.

**Answer from the code first.** Anything the repository can settle,
settle yourself and do not ask. Only a real decision reaches the person. If
you are unsure whether something is clear, it is not: ask.

## Ask through the question dialog

Use `AskUserQuestion`, so each answer is one selection, or typed when
none fits.

- **One thing a question.** Atomic: never two decisions in one.
- **Each question stands on its own.** Say the background in plain
  words inside the question: which phase, what happens, why it
  matters. The earlier chat may not be on screen while the dialog is
  open.
- **Two to four real options**, your recommendation first and marked
  "(Recommended)", each with a description of what it would mean.
- **Up to four questions a round.** Ask the most consequential first.
  After each round, ask follow-ups the answers raised, and carry on
  until nothing is left. There is no limit on rounds.
- **Use the project's own words** for things, as the plan does.

## Write the answers into the plan

After each round, before asking the next:

- **Tick each question answered under `## Open questions`**, with the
  answer beside it and "Answered in `/g`" and the date. A question first
  raised in the interview is added there, ticked and answered, so the
  section records every decision made. Never delete the section, a
  question or an answer: it is the audit record.
- **Where an answer changes a step, change the step** as well, so the
  plan reads as instructions and the question records why.
- **Put each job only a person can do under `## Before running /f`**, one
  unticked checkbox each, saying exactly what to do and where. Tick one
  only when they say it is done. This section stays afterwards too.

Both sections take the shape `.claude/rules/plans.md` sets out.

## Finish

When nothing is left to ask, report:

- **What changed in the plan**: the steps an answer changed.
- **What is still unticked under `## Before running /f`**, as a
  numbered list of what the person needs to do.
- **Whether `/f` can start**: yes only when every box in both sections
  is ticked.
