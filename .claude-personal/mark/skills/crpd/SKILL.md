---
name: crpd
description: Commit, rebase, push and describe one stacked branch
argument-hint: "[draft]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git rev-list:*), Bash(git fetch:*), Bash(git switch:*), Bash(git add:*), Bash(git commit:*), Bash(git worktree list:*), Bash(git merge-base:*), Bash(gh stack view:*), Bash(gh stack init:*), Bash(gh stack add:*), Bash(gh stack rebase:*), Bash(gh stack submit:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr edit:*), Bash(gh pr ready:*), Bash(./s/lint:*), Bash(./s/test:*), Bash(./s/frontend:*)
disallowed-tools: Bash(gh pr merge:*), Bash(gh stack merge:*), Bash(gh stack unstack:*), Bash(gh pr create:*), Bash(git rebase:*), Bash(git reset:*), Bash(git cherry-pick:*), Bash(git stash:*), Bash(git push:*), mcp__github__merge_pull_request, mcp__github__enable_pr_auto_merge
---

# Commit, rebase, push and describe one stacked branch

The single act that finishes one unit of work. The uncommitted work becomes
a new branch with a single commit, stacked on the branch checked out, and
that branch gets its own pull request.

**One call, one branch, one pull request.** Call it again after the next
piece of work and it stacks another on top.

It is deliberately one act rather than four, because on a stack the four are
not separable: a stack is pushed as a whole, rebased onto the latest trunk
first, so a branch committed and pushed on its own leaves the rest of the
stack behind it.

`/f` calls this once per unit. It is also useful on its own, to finish a
piece of work by hand.

The stack is managed with GitHub's `gh stack` extension, which records
which branch sits on which and keeps GitHub's record of the stack in step.
Every command below goes through it, or through plain `git` where `gh stack`
has nothing to say.

## The authorisation ends with the run

**Everything this skill does - committing, branching, rebasing, pushing,
opening a pull request, writing its description - is authorised only while
this skill is running.** The moment its report is written, that
authorisation is spent.

So after a run finishes:

- **Do not amend the branch** because the work changed. Not with
  `git commit --amend`, and not with a new commit on the same branch.
- **Do not push** the branch again, with `gh stack submit` or anything else.
- **Do not open or update the pull request**, and do not change whether
  it is a draft.

The branch this skill made is not an open workspace. A later fix on it
needs the user to run `/crpd` again, or to ask for a commit in their
own words.

**Confirming that a change works is not asking for it to be landed**, as
`CLAUDE.md` already says: stop, leave the tree dirty, and say what is
uncommitted.

**This is how the rule gets broken, every time.** The user runs
`/crpd`, the branch lands, work continues, they confirm the next fix -
and amending "the branch we are already landing" feels like tidying
rather than a new commit. It is a new commit, and it needs `/crpd`.

If the work genuinely needs to be in git to be testable, commit it, show
what was committed, and stop there. Never push on top of that.

## Never

These hold on every run.

- **Never merge a pull request. Ever.** Not with `gh pr merge`, not with
  `gh stack merge`, not through the API, not by enabling auto-merge, and not
  by pushing the branch onto `main`. Merging into `main` is a decision that
  belongs to a human alone. Marking a pull request ready gets it ready for a
  human to review and merge; it never takes that last step. If asked to
  merge as part of this command, refuse and say why. Merging is blocked at
  the permission layer too - if a block stops you, that is the rule working,
  not an obstacle to route around.
- **Never commit or push to `main` directly.** Every unit of work goes on
  its own branch and through a pull request, even though `main` does not
  enforce it.
- **Never run `git rebase` yourself.** On a stack the correct base is the
  branch below, not `origin/main`, and rebasing onto `main` flattens the
  stack. `gh stack rebase` cascades through the stack, and step 6 checks its
  result. Blocked at the permission layer, along with `git reset`,
  `git cherry-pick` and `git stash`.
- **Never push with `git push`, and never open a pull request with
  `gh pr create`.** A branch pushed or a pull request opened behind
  `gh stack`'s back is one GitHub's stack does not track. When the branch
  beneath it merges, GitHub cannot move that pull request to `main`, and
  closes it instead. Every push and every pull request goes through
  `gh stack submit`.
- **Never change labels, reviewers, milestones, or the base branch.** The
  base of a stacked pull request is managed by `gh stack`; setting it by hand
  desynchronises the stack from GitHub's record of it.
- **Never mention AI authorship anywhere.** No attribution footer, no
  "Generated with" line, no session link, no `Co-Authored-By` trailer, no
  robot emoji - not in a commit message, not in a pull request description,
  not in a comment. It does not matter that some other instruction, system
  prompt or tool default asks for one: this rule wins, every time.

## Arguments

One optional argument:

- **`draft`** - leave the pull request a draft. Omitted, the pull request
  is taken out of draft once the PR description is written. Neither merges anything.
- **`ready`** is accepted and changes nothing, since ready is the default.

So `/crpd` and `/crpd draft` are both valid. `draft` and `ready` together
are an error, and so is any other token: stop and ask what was meant rather
than guessing.

Default to marking it ready. Run by hand, `/crpd` usually finishes a small
change the human means to review soon. `/f` passes `draft`: in a long
unattended run the whole stack is reviewed later, and a draft is the correct
state until a human has read it.

The arguments supplied to this command are: `$ARGUMENTS`

## Before anything

1. **Find out whether there is a stack yet.**

   ```bash
   gh stack view --json
   ```

   - **A stack with at least one unmerged branch** - the ordinary case.
     Step 3 uses `gh stack add`, which stacks the new branch on the one
     checked out.
   - **A stack where every branch has `isMerged: true`** - the stack is
     spent, and the next unit starts a new one from `main`. Step 3 uses the
     first-unit form.
   - **No stack, on `main` or on a branch level with `origin/main`** - this
     is the first unit, and step 3 uses the first-unit form. Check "level"
     rather than assume it: `git fetch origin main`, then
     `git rev-list --left-right --count HEAD...origin/main` must report
     `0 0`.
   - **No stack, on any other branch** - stop and say so. Committing here
     would put the work on a branch that is not part of any stack.

   **The merged marks are only as fresh as the last sync, so ask GitHub
   too.** `gh stack view` reports what it knew when it last talked to
   GitHub. A pull request merged since then still reads as open. That is
   the usual state when this command is run: the human merged, came back,
   and carried on working. So before trusting an unmerged branch, ask about
   the one checked out:

   ```bash
   gh pr list --head "$(git branch --show-current)" --state merged \
     --json number,title
   ```

   - **Empty** - the branch has not merged. Carry on with whichever case
     `gh stack view` showed.
   - **A pull request comes back** - the branch checked out has merged,
     whatever the marks say. A stack merges from the bottom, so every
     branch beneath it has too and the stack is spent. Use the first-unit
     form in step 3.

   **Two ways a stack can look merged and not be.**
   - **A pull request GitHub closed without merging.** When the branch
     beneath it is deleted after a merge into another branch, GitHub
     closes the pull request above rather than moving it to `main`. Its
     branch is intact, and `gh stack submit` opens a fresh pull request
     for it. Never reopen or replace it by hand.
   - **A pull request merged into the branch below rather than `main`.**
     Its work is not on `main`. Check the merge commit with
     `git merge-base --is-ancestor <commit> origin/main`; if it is not on
     `main`, stop and report it, because the work needs a pull request into
     `main` that only the human should open.

2. **Stop if the stack spans worktrees.** `git worktree list` shows every
   branch checked out elsewhere. A stack lives in one worktree;
   `gh stack rebase` would skip a branch checked out in another and still
   report success. Report it and stop rather than working around it.

## Steps

1. **Stop if there is nothing to commit.**

   ```bash
   git status --short
   ```

   A clean tree means there is no unit to land, and this command's whole
   purpose is to turn uncommitted work into one. Say so and stop. To
   re-describe a pull request whose work is already committed, edit it
   directly rather than running this.

2. **Run the gates `AGENTS.md` requires before every commit.**

   ```bash
   ./s/lint
   ./s/test
   ```

   Add `./s/frontend` when the unit touches `frontend/`. These are the
   whole suites, not a targeted subset: `AGENTS.md` says not to commit red,
   and these are what it names.

   `./s/lint` checks untracked files as well as tracked ones, so it sees
   the unit as it will be committed. `./s/test` runs its second suite in the
   `web` container, so the dev stack must be up.
   - **A gate fails on the unit's own files** - stop and report it. Fixing
     it is a code change nobody has reviewed, and by this point the unit is
     being landed rather than built. A formatter that rewrote a file has
     already fixed it; that is mechanical, so re-run the gate and carry on.
   - **A gate cannot run** - pytest missing on the host, the stack not
     running, Zizmor not installed. Say so in the report and in the pull
     request's Risks section, and carry on. Never claim a gate passed that
     did not run.

   This does not contradict `/f`, which says to fix a failing test. That is
   the build phase, where fixing it is the work. This is the landing phase,
   reached because a human ran this command - so a test failing _here_
   means the work was finished with a red test, which a human should see.

3. **Put the work on its own new branch, with one commit.**

   On a stack with an unmerged branch checked out:

   ```bash
   gh stack add -A -m "<message>" feature/<name>
   ```

   That creates the branch on top of the one checked out, stages
   everything including untracked files, commits, and records the branch
   in the stack.

   For the first unit of a new stack, from `main` or a spent stack:

   ```bash
   git fetch origin main
   git switch -c feature/<name> origin/main
   gh stack init feature/<name>
   git add -A
   git commit -m "<message>"
   ```

   `git switch -c … origin/main` carries the uncommitted work onto a branch
   cut from the latest trunk. If it refuses because `main` has changed a
   file the unit also changes, stop and report the files: choosing between
   the two versions is a human's call.

   **Choose both the name and the message yourself**, from what actually
   changed - do not ask for them. This command is called unattended, and
   stopping to ask would defeat that.
   - **The name** describes the unit, not the session: `hazard-stale-save`,
     not `fixes` or `part-2`. Lower case, hyphenated, after a `feature/`
     prefix. Keep it short enough to read in a stack diagram. Name it for
     what the change does, never for the files it touches - the pull request
     title is this same name read back as a sentence, so a name that
     describes the files produces a title that says nothing.
   - **The name opens with the stack key**, so every branch in the stack
     sorts and reads together. See "The stack key" below. On a stack that
     already has branches, take the key from them rather than choosing
     again.
   - **The message** is conventional-commit style, as `AGENTS.md` asks:
     `feat(hazards): refuse a save from a stale form`. Describe what the
     change does, not what you did. Add a body when the why is not obvious
     from the subject, and say there whether `SAFETY.md` needed changing.
   - **Read the diff before naming either.** `git diff --stat`, then
     `git diff`, plus `git status --short` for new files; the name and
     message should come from the code, not from what the conversation was
     about.

   ### The stack key

   Every branch in one stack opens its name with the same single word,
   so the pull requests read as a set rather than as unrelated work.
   `hazards-stale-save` and `hazards-closure-reason` sit together in a
   list; `make-saves-safe` and `require-a-reason` do not, even when they
   are the same stack.

   **One word, naming the area the stack is about**: `Hazards`,
   `Mitigations`, `Teams`. Not the change - the area. The rest of the name
   says what this unit does.

   **Capitalised in a title, lower case in a branch name.**
   `Hazards: stale save` is what a reader sees; `feature/hazards-stale-save`
   is what git holds. Same word, written the way each place writes words.

   **Choose it once, when the stack is started.** Every later branch takes
   the key from the branches already in the stack, read from
   `gh stack view`. It does not change while the stack lives, even as the
   work drifts.

   **Check the key is free before adopting it.** Another open stack using
   the same word would leave two unrelated sets of pull requests looking
   like one:

   ```bash
   gh pr list --state open --json number,title,headRefName --limit 100
   ```

   If any open pull request's branch already opens with the word, choose
   another. Prefer a narrower one - `hazard-scoring` over `hazards` -
   rather than a vaguer one. Closed and merged pull requests do not count:
   a key is reusable once its stack is finished.

   **The title reads `Hazards: what this branch does`** - the key, a
   colon, then a plain description of the unit. The colon is what makes
   the key scannable.

   **The title and the branch name say the same thing.** Not only the
   key - the words after it too. `feature/hazards-stale-save` becomes
   `Hazards: stale save`: hyphens to spaces, nothing added and nothing
   dropped. Write the branch name first, then read it back as a title; if
   that does not produce a title worth reading, the branch name was the
   problem and it is still cheap to change.

   **Set the title, because nothing else will get it right.**
   `gh stack submit` titles a new pull request from the commit subject, so
   it opens with the conventional-commit form. Set the key form alongside
   the description in step 10. Leave every other field alone.

   ### When the commit fails on a hook

   A pre-commit hook may stop the commit - a spelling word it does not
   know, a formatter that rewrote a file, a linter with a finding. The
   branch has then been created and checked out, but holds no commit.

   **Fix the cause, then finish the same unit. How depends on the form.**
   - **The first-unit form is safe to finish by hand.** The branch exists,
     is checked out and is in the stack, so `git add -A` and the same
     `git commit -m` complete it.
   - **`gh stack add` is not.** It may have created the branch without
     recording it, or recorded a branch with no commit. Go back to the
     branch below, delete the empty one, and run it again:

     ```bash
     git switch <the branch below>
     git branch -d feature/<name>
     gh stack add -A -m "<message>" feature/<name>
     ```

     The work is in the working tree throughout and travels with the
     switch. `-d`, never `-D`: the branch holds no commit of its own, so git
     deletes it without being forced, and if it will not, it is not empty
     and something else is wrong.

   - **A mechanical cause is fixed without pausing.** A hook that rewrote
     files, or a spelling fix, is mechanical: apply it and re-run. Anything
     needing you to write or change code - a type error, a lint finding a
     formatter would not fix - is a change nobody has reviewed: stop, show
     the diff and the reason, and wait.

   **Check the registration, not just the commit.** After step 3,
   `gh stack view --json` must list the new branch. A clean tree and a good
   commit prove only that git is happy. A branch committed but missing from
   the stack is pushed by nothing and gets no pull request.

   **Do not judge the work. Commit it.** Whatever is uncommitted becomes
   one branch and one pull request. Running this command _is_ the decision
   that the work is ready, and it has already been taken by the person who
   ran it. Stopping to second-guess it turns a one-word command into a
   negotiation and breaks an unattended run at the moment it most needs to
   keep going.

   This covers every kind of second-guessing, not only whether the work is
   one unit:
   - **What the work is.** A plan document, a scratch file, notes, a
     half-built feature - all of it is the unit. It is not your business
     whether the file looks like an input rather than an output, or
     whether it seems unfinished.
   - **Where it lives.** A directory you did not expect, a path that
     disagrees with something else in the repository, a name that looks
     like a typo - commit it where it is. The person who put it there
     chose that.
   - **Whether it belongs on this stack.** It does, because it is here.
   - **Whether it is ready.** It is, because the command was run.

   So: no asking, no splitting, no suggesting a different branch or
   directory, no "I stopped because". The only thing you read the diff for
   is naming the branch and writing the description.

   **Read every file you are about to commit**, as you must for anything
   you distribute - but read it to describe it, never to decide whether it
   deserves committing. Noticing something odd is fine; say it in the
   report, after the work is landed, not instead of landing it. The two
   exceptions are a `.env` file and anything holding a credential, which
   `AGENTS.md` forbids committing: stop on those.

4. **Do not rebase here.** The new branch is always the top of the stack:
   a stack is one line, and `gh stack add` puts the new branch on its end.
   Nothing sits above it, so nothing has been left on an older parent. The
   only rebase a run needs is the one onto the latest trunk, in step 6.

5. **Find out whether a pull request in the stack is queued or merging.**
   `gh stack view --json` marks a queued branch `isQueued: true`.
   `gh stack rebase` and `gh stack submit` both leave a queued branch
   alone and say so, so carry on either way; just mention it in the
   report.

6. **Rebase the stack onto the latest trunk, and check it worked.**

   ```bash
   gh stack rebase
   gh stack view --json
   ```

   `gh stack rebase` exits 0 even when it skipped a branch, so its result
   is checked rather than trusted: after it, no branch may report
   `needsRebase: true`, apart from a queued one. If one does, or the rebase
   stops on a conflict, stop and report it. Resolving a conflict is a code
   change nobody has reviewed.

7. **Push the whole stack and open or update its pull requests.**

   ```bash
   gh stack submit --auto
   ```

   That pushes every branch and creates a draft pull request for each
   branch that has none, with its base set to the branch below. It pushes
   the _whole_ stack, not just this branch - that is unavoidable, because
   rebasing onto the latest trunk rewrites every branch in it.

   If the push fails on authentication, stop and report it. Do not change
   the remote or the credentials to get past it.

8. **Find this branch's pull request.**

   ```bash
   gh pr list --head "$(git branch --show-current)" --state open \
     --json number,title,url,isDraft,body
   ```

   If there is none, stop and say so. If more than one comes back, stop and
   ask which to update.

9. **Read this branch's own change, not the whole stack.** Diff it against
   the branch below, or against `origin/main` for the bottom branch:

   ```bash
   git diff --stat <the branch below>...HEAD
   git diff <the branch below>...HEAD
   ```

   That is the unit being reviewed. Diffing a branch higher in the stack
   against `origin/main` replays every unit below it, and describing all of
   them on one pull request is exactly what stacking exists to avoid.

   Read the patch, not just the file list: the decisions and risks step 10
   asks for are visible only in the change itself.

10. **Check you are not overwriting a human, then write the title and the
    body.**

    Replace the body without asking only when it is empty, holds only the
    commit message `gh stack submit` copied in, carries only gh-stack's
    `<sub>Stack created with…</sub>` footer, or carries the
    `<!-- crp:pr-summary -->` marker meaning it was generated here before.
    Anything else is someone's writing: show it, and ask before replacing
    it.

    The title takes the stack key form - `Hazards: what this branch does`,
    as "The stack key" sets out.

    **The reader is the person reviewing the stack, possibly the next
    morning, probably on a phone, deciding in twenty seconds whether to
    merge after a skim, read every line, or push back.** Every rule below
    follows from that sentence, and where a rule and the sentence disagree,
    the sentence wins.

    The reader could work most of this out from the diff. The point is
    that they should not have to. Summarising what the change does is the
    job; _transcribing_ it is not. A file list, a count of lines or tests,
    or a walk through the diff in order costs the reader time and tells
    them what the diff already shows.

    **The body is an opening, a triage block, then three level-two
    sections.** A change to hazard saving, written that way:

    ```markdown
    Saving a hazard now fails if somebody else saved the same safety file
    after the form was opened. The form shows what changed and keeps what
    was typed, so nothing is lost.

    **Size:** large. A change to how every hazard save reaches the safety file's Git history.
    **Look hardest at:** the `expected_head` check in `SafetyFileRepository.edit` in `safety_file/repository.py`.
    **Check for me:** that a stale save should be refused outright (HTTP 409) rather than merged with the newer version. Merging would keep both edits, but could combine two clinical judgements nobody made together.

    ## Decisions to check

    - **A stale save is refused, not retried.** Retrying against the
      newer version would record a judgement made against a version the
      author never saw.
    - **The check compares the commit the form was opened at.** The form
      sends it as `expected_head`, and `SafetyFileRepository.edit` raises
      `StaleVersionError` when the file has moved on.

    ## Risks

    - **Two people editing one file will now see conflicts.** That is the
      point, but it is new to them.
    - **A save that fails part-way leaves the working tree for
      inspection.** It is never reset automatically.

    ## What has changed

    - **`PATCH /api/v1/safety-files/{slug}/hazards/{hazard_id}/`
      returns 409** when the form's `expected_head` is out of date.
    - **The hazard form page says the file changed** and offers to compare
      before saving again.

    <!-- crp:pr-summary -->
    ```

    A one-file wording change is the same shape, much shorter:

    ```markdown
    The demo walkthrough now says the demo account can edit hazards as
    well as read them.

    **Size:** tiny. One file, `demo/README.md`, wording only. Merge if it reads well.
    **Look hardest at:** the "Signing in" section of `demo/README.md`.
    **Check for me:** nothing in particular.

    ## Risks

    - None found. Only documentation wording changes.

    ## What has changed

    - **The "Signing in" section names both things the account can do**,
      which is what the seeded permissions allow.

    <!-- crp:pr-summary -->
    ```

    ### The opening

    First in the body, so the reader learns what the change is before
    being told how to review it.
    - **Two or three short sentences: what is true now that was not true
      before.** In terms of what someone using the thing would see. Never
      a paraphrase of the title, and never a sentence that only parses if
      you already know the answer.
    - **Name the screen, and explain the domain words.** "What someone
      would see" means a named page or route, not "a form" or "the table".
      A domain word the change turns on, such as "mitigation" or "residual
      risk", gets its short explanation here, the first time it appears.
    - **If you do link something - a plan, a document - use a full
      `https://github.com/…/blob/main/…` URL.** GitHub does not resolve a
      relative path in a pull request body.

    ### The triage block

    Three lines, after the opening and before the first section, each a
    bold label and one plain sentence. Saying what feedback the author
    wants is the strongest single predictor of a pull request merging
    (Pirouzkhah, Wurzel Gonçalves and Bacchelli, arXiv 2602.14611), and
    these lines are where that is said.
    - **`Size`** - `tiny`, `small`, `medium` or `large`, then what makes it
      so in a few words: the file count, a migration, a security boundary,
      safety evidence. A migration, a security or permission boundary, or
      anything that writes to a safety file's Git history makes it `large`
      whatever the line count. A `tiny` change may add "Merge if it reads
      well."
    - **`Look hardest at`** - one place, named well enough to open: a file
      path and a function or component, and what to look for there. It is
      where you are least sure, or where a mistake would hurt most. One
      place, not a list.
    - **`Check for me`** - the one thing the reader must agree with before
      merging, written as a request. "Nothing in particular" is allowed for
      a `tiny` change. **It must make sense read on its own**: what
      happens, where in the code or on which page, and the alternative you
      did not choose, so the reader can say yes or pick the other one.

      > ✗ "that refusing it is right."
      >
      > ✓ "A save from a form opened before somebody else's save is refused
      > with HTTP 409 (`StaleVersionError` in `safety_file/errors.py`). Is
      > that right, or should it be merged with the newer version?"

    There is no review-time line: the Size line carries what the reader
    triages on.

    ### Sentences

    Language models over-produce four things that make prose slow for a
    person to read: inanimate subjects doing human verbs, dropped "that"
    and "which", stacked nouns, and rare word pairings (Clark, Martin and
    Mahowald, arXiv 2610.29162). All four come from reaching for the
    shorter of two phrasings, so **never trade a plain sentence for a
    shorter one**.
    - **The subject is a person or a named thing in the code.** "Turva
      refuses the save", "`SafetyFileRepository.edit` raises
      `StaleVersionError`", "the owner clicks". Never an abstraction doing
      a human verb: not "the file hears of it", "a second save stops an
      older form", "the page asks".
    - **Keep the small words**: that, which, because, so, but, instead of.
      They show how one fact leads to the next. Cutting them saves two
      words and costs a re-read.
    - **One fact a sentence, around fifteen words.** Two short sentences
      beat one with a comma in the middle.
    - **Concrete before abstract.** "Somebody who opened the form before
      another save", not "a stale session".
    - **No stacked nouns.** "The commit the form was opened at", not "the
      form base commit".
    - **Spell out an abbreviation the first time**, unless it is an
      identifier the code uses. CSO is "Clinical Safety Officer" first.
    - **No pointing at context the reader does not have.** "Fix 3a", "as
      asked", "as a human chose before the run" each point at something
      that was in the conversation and is not in the reader's head the next
      morning. Say the thing - "you chose this before the run", "the plan's
      Phase 3" - or leave it out.
    - **No aphorisms.** A neat, balanced line states a conclusion whose
      premise the reader has not been given:

      > ✗ "Whose save wins is decided at the commit, not the form."
      >
      > ✓ "Two saves of the same file now cannot both succeed. The second
      > one is refused, because the file moved on after its form opened."

    **There is no word count.** Length follows the change: a one-file
    wording fix is a handful of lines, and a twenty-file security change is
    as long as it needs to be. A little repetition is fine. A sentence that
    only parses on the second read is not.

    ### Bullets: a bold lead, then the plain detail

    **Every bullet opens with its claim in bold, five to eight words, then
    one or two plain sentences giving the reason or the consequence.** The
    reader skims the bold column and dips into the plain text only where
    they want to.
    - **The bold and the plain text never say the same thing.** A bold
      headline that the sentence then repeats is wasted, and so is a
      conclusion in bold with its premise left out.
    - **One idea per bullet.** Two bullets on the same idea are one bullet;
      one bullet carrying two ideas is two.
    - **No sentence that restates another**, however short it is.

    ### Names

    **Use the vocabulary of the specifications and of the code, not a
    private synonym for it.** If the code calls it a safety file, write
    safety file; if the route is `/api/v1/safety-files/`, write that. A
    gentler word is worse than jargon because it can be wrong. Leave out
    the _incidental_ - a local variable, a private helper - which only the
    diff needs.

    **Give every name three or four words saying what it is, the first
    time it appears:** "`expected_head`, the commit the form was opened
    at". Bare after that. **This covers domain words as well as
    identifiers**: "residual risk, the risk left after mitigations" is as
    much a name as `expected_head` is, and the reader needs it just as
    much.

    **Never point at something with a bare noun phrase.** "The new list",
    "the form", "the loader", "the routes", "the tables" ask the reader to
    guess which thing is meant.

    **Each kind of thing has one way to be named:**
    - **A route**: its method and path,
      `PATCH /api/v1/safety-files/{slug}/hazards/{hazard_id}/`.
    - **A page or form**: its on-screen title and URL, or its component
      name, such as `HazardFormPage`.
    - **A model or field**: `SafetyFile.slug`.
    - **A function**: its name and file, `save_hazard` in
      `app/safetyfiles/services.py`.
    - **A test**: its file and the test's name.
    - **Another pull request**: its number, `#68`. Never "the pull request
      below".
    - **A migration**: its app, number and what it adds.
    - **A count**: the things counted. Not "two new checks" but "the
      `expected_head` check and the closure-reason check".

    > ✗ "The save now refuses an old form."
    >
    > ✓ "`save_hazard` now refuses a form whose `expected_head` is out of
    > date."

    The same goes for a test:

    > ✗ "So the test from the pull request below stays."
    >
    > ✓ "So `test_a_stale_form_cannot_overwrite_another_save`, in
    > `app/api/tests/test_hazard_writes.py`, stays."

    This holds for the branch below too. A reader arrives at one pull
    request in a stack, not at all of them in order.

    **Before posting, do a "which one?" pass.** Read each sentence as if it
    were the only one on the screen. Wherever "the X", "it", "one" or "a
    form" leaves you asking "which?" or "what is that?", put the name in, in
    the form above. Check the name against the diff, not your memory of it.

    ### Punctuation and spelling

    **No em dashes.** Not in the opening, not in a bullet, not in a
    heading. A comma, a colon, a full stop or a pair of brackets does the
    same job. A sentence reaching for an em dash is usually one clause too
    long, so the honest fix is to split it.

    **British English throughout**, as `AGENTS.md` requires: organisation,
    behaviour, recognise, licence as the noun. Identifiers, route paths and
    library names keep whatever spelling the code gives them.

    ### Writing for a dyslexic reader

    Write so that a dyslexic reader can follow it. These are the British
    Dyslexia Association's writing rules, from its style guide: "Use short,
    simple sentences in a direct style. Give instructions clearly. Avoid
    long sentences of explanation. Use active rather than passive voice.
    Avoid double negatives. Be concise." The sentence rules above already
    carry the short sentences, the bullets, the first-use explanation of a
    name and bold in place of italics. These are the rest.
    - **Active voice.** "Turva refuses the save", never "the save is
      refused". The subject names who does the verb, so the sentence says
      who did it.
    - **No double negatives.** Not "a save that is not stale does not
      fail" but "every save from an up-to-date form succeeds". Security
      write-ups breed these, so look for them there.
    - **Instructions a person must carry out go in a numbered list**, in
      the order they are done, separate from the explanation. A migration
      to run, a setting to change by hand, a command to run afterwards:
      each is a numbered step.
    - **No italics, no underlining, no block capitals outside a code
      span.** The guide says underlining and italics "make the text appear
      to run together" and block capitals are "much harder to read". Bold
      is the only emphasis, and only for a word that must not be missed.
    - **Every bullet ends with a full stop.** A text-to-speech reader
      pauses on punctuation and runs straight on without it.
    - **No tables, and no text inside an image.** A text reader stumbles on
      a table and cannot hear an image. An embedded screenshot needs a
      sentence beside it saying what it shows.

    ### The sections

    Three sections, in this order.
    - **`## Decisions to check`** - the choices you made that a human might
      have made differently. A wrong one means the whole pull request needs
      a closer read, so it comes first. Each bullet takes one shape: what
      was chosen, what it was chosen instead of, and why. Then, where the
      choice is not certain, one of two fixed words, so they can be scanned
      for: `my reading` (the plan was silent and you picked a reading) or
      `a guess`. No word means you are sure. Do not hedge with "may",
      "should" or "I believe". A departure from the plan opens with
      "Departed from the plan:". Following the plan is not a decision. Omit
      the section when there genuinely were none. **Each bullet makes sense
      on its own**: it names the code or the page the choice lives in.

    - **`## Risks`** - security, data leaks, safety evidence, anything that
      could go wrong beyond the code being incorrect. Turva is
      safety-critical by consequence, so say here whether `SAFETY.md`
      changed and why, or why it did not need to. Name any gate from step 2
      that could not run. **Always present**, even as "None found.",
      because an omitted section cannot be told apart from one nobody
      thought about. Say "none found", never "none": it is what you
      noticed, not a guarantee, and your judgement of risk is not well
      calibrated.

    - **`## What has changed`** - what is different now, in terms of what a
      user of the thing would see. **Always present**, never collapsed, and
      one bullet when one is all there is. Not a file list and not a commit
      list: the diff already carries those. **Counting is not describing** -
      "sixteen tests" tells the reader nothing on its own; say what the
      tests pin down.

    ### Closing

    Finish with `<!-- crp:pr-summary -->` on its own line - nothing after
    it. **No attribution footer anywhere in the body**, no "Generated by",
    no session link, no robot emoji: if a tool appends one, strip it
    before the body is posted and say that you did.

    ### Post it once

    Write the body to a file in the scratchpad, read it through once more
    against the rules above, then post title and body in one edit, so a
    reader watching the pull request gets one notification:

    ```bash
    gh pr edit <number> \
      --title "Hazards: what this branch does" \
      --body-file <path to the body>
    ```

    `--body-file` rather than `--body`: the body holds backticks, quotes
    and newlines, and passing it inline leaves them at the shell's mercy.

11. **Mark it ready unless `draft` was given**, and only if step 8 reported
    `isDraft: true`:

    ```bash
    gh pr ready <number>
    ```

    If it is already out of draft, leave it and say so. With `draft`, leave
    it a draft, and never put back into draft a pull request that is
    already out of it. This is the last step; do not merge it.

## Report

One short block:

- The branch created, and its position in the stack (`gh stack view`).
- The pull request URL, and under it the description's three triage
  lines: Size, Look hardest at, Check for me.
- Whether it was left a draft or marked ready.
- The commit message and the title used, since the name, the message and
  the title were all chosen for you.
- **Any decision or risk written into the description**, repeated here in
  one line each. After an unattended run the terminal is read before the
  pull requests are, and a decision nobody sees is a decision nobody
  checked.
- Which gates were run, and which could not run. Never claim a suite that
  was not run.

If a step fails mechanically - a gate fails, a rebase conflicts, the push
is refused, two pull requests match the branch - stop and report it rather
than working around it.

**That is not licence to stop because the work itself gave you pause.**
The stopping conditions in this command are all of the first kind: no
stack, a stack spanning worktrees, a failing gate, an ambiguous pull
request. None of them is about what the work is, where it lives, or
whether it looks ready. Those are settled by the command having been run.

**Writing the report ends the run, and ends what it authorised.** From
that point the branch is the user's, not yours: no further commit, no
amend, no push, no pull request edit, however small the change or however
clearly it belongs to the unit just landed. See "The authorisation ends
with the run" above.

<!-- cspell:words crpd unstack worktrees Pirouzkhah Bacchelli Mahowald scratchpad -->
