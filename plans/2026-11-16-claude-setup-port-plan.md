# Claude setup port plan

An alternative codebase has a Claude Code setup built up over months of daily use: a long `CLAUDE.md`, path-scoped rules, skills for committing, planning and following plans, and hooks for notifications and terminal tabs. Turva has `AGENTS.md` and nothing under `.claude/`, which is git-ignored here. Mark wants the same way of working in Turva, eventually finding a way to integrate the agents.md file and .claude-personal folder, and the setup is the first thing to bring across because the rest of the port from that codebase will be done with it. This separation of LLM materials is only to get Mark working as fast as possible on the Turva codebase. The team will need to figure out how best to integrate all LLM materials.

The files were copied over unchanged, so they still describe the alternative codebase: its FastAPI backend, its `just` recipes, its docs folder and its production alerts. This plan rewrites them for Turva, in the order the pieces depend on each other, until nothing specific to the alternative codebase is left. They are tracked in `.claude-personal/mark/` and linked into `.claude/` on Mark's machine only, so they change nothing for anybody else until they are agreed and moved into a shared `.claude/`.

## Phase 1: Bring the files across

- [x] Copy `.claude/` from the alternative codebase into Turva's ignored `.claude/`. Its main checkout was chosen over its fork because it is slightly newer; the two differ in two lines of the rules and one paragraph of `CLAUDE.md`.

- [x] Keep the alternative codebase's `CLAUDE.md` as `.claude-personal/mark/reference-CLAUDE.md`, a reference copy that Claude Code does not load. It is ignored by `.claude-personal/mark/.gitignore`, so it is never committed. Turva's root `CLAUDE.md` is tracked and points to `AGENTS.md`, so it was not overwritten, and its instructions would contradict `AGENTS.md` if they were live.

- [x] Remove `"model": "opus"` from the copied `.claude/settings.json`, because it would override the model chosen per user.

- [x] Move the skills, the rules and the reference `CLAUDE.md` into a tracked `.claude-personal/mark/` folder, and link `.claude/skills` and `.claude/rules` to it. Claude Code only loads from `.claude/`, so the tracked copy is inert for other people and for the overnight routine. The hooks, `settings.json` and `settings.local.json` stay as real files in the ignored `.claude/`.

- [x] Add the `link-claude` recipe (`just lc`) to `justfile`, which creates or refreshes the two links in a new clone or worktree and refuses to replace a real folder.

## Phase 2: Make the plan rules fit Turva

This comes first because the plan rules govern this document and every plan that follows it.

- [x] Change the `paths:` in `.claude-personal/mark/rules/plans.md` from `docs/docs/plans/**` to `plans/**`, so the rule loads when a Turva plan is opened.

- [x] Remove the section on accessibility journeys from `plans.md`. It named `docs/docs/frontend/accessibility/journeys.md` and `testing-log.md`, which Turva does not have.

- [x] Change the `p` skill in `.claude-personal/mark/skills/p/SKILL.md` to write to `plans/`.

- [x] Do without an index of plans. `plans/index.md` is removed, and `.claude-personal/mark/rules/plans.md` now says that the folder listing, sorted by the date in each filename, is the register.

- [x] Bring across the alternative codebase's plan updates of 13 November 2026: a "Write it to be built by `/f`" section in `plans.md`, with `## Open questions` and `## Before running /f` checklists; the matching paragraph in `p`; the gate in `f` that waits while either checklist has an unticked box; and the `g` skill, which interviews the person on a finished plan and writes the answers into those checklists. `g` speaks of "the person who ran it" rather than naming anyone.

## Phase 3: Write Turva's CLAUDE.md

- [x] Read `.claude-personal/mark/reference-CLAUDE.md` end to end and sort each section into three groups: how Mark works with Claude whatever the project (reply style, plan discipline, commit habits, British English, no em dashes), facts about the alternative codebase that have a Turva equivalent (commands, branch rules, where documents live), and facts that have none (its clinical record services, its alert watcher, the stack recipes, brands).

- [x] Write `.claude-personal/mark/CLAUDE.md` from the first two groups. It defers to `AGENTS.md` for the stack, the safety invariants, the `./s/` scripts and the approval rules, and does not restate them: two copies would drift, and `AGENTS.md` is the one Marcus and the overnight routine read. Where the alternative codebase's habit and `AGENTS.md` disagree, `AGENTS.md` wins and the difference is recorded under Decisions below. Written at about 190 lines against the reference's 1,028. It imports `AGENTS.md` with `@AGENTS.md` and says that file wins unless this one is stricter. It keeps: change code only on `implement` or `i`; one sentence before working; a closing `## TL;DR`, with `## Conclusion` for finished work; dyslexia-friendly British English with no em or en dashes; the Git rules; the test rules; spacing functions as paragraphs, typing, validating at the edges and explicit authorisation; using `./s/` and `just`; and keeping `.private/` out of commits. One rule was loosened from the original for a while: a direct request such as "remove 1 to 4" also counted as the instruction to change code. That was taken out again on 16 November 2026, so only the bare word, `/crpd` or `/f` counts, as in the original.

- [ ] Settle the Git workflow wording. The alternative codebase requires `feature/*` branches, stacked pull requests and a merge queue. `AGENTS.md` currently allows direct commits to `main` and says to move to branches and pull requests when more contributors join. With two people now committing, that condition may already be met, which is a question for Marcus, not something to assume in this file. For now `.claude-personal/mark/CLAUDE.md` is stricter than `AGENTS.md` for Claude working with Mark only: commit only when asked, never merge, every unit on a `feature/*` branch stacked with `gh stack`, one commit per branch, and no AI attribution except in overnight runs. `AGENTS.md` itself is unchanged until Marcus agrees.

- [x] Add `CLAUDE.md` to the `link-claude` recipe, linking `.claude/CLAUDE.md` to `.claude-personal/mark/CLAUDE.md`, and run it. Only do this once the Turva version is written, so the copied version is never live in this repository. Done: the recipe links it as a single file and refuses to replace a real `.claude/CLAUDE.md`.

- [ ] Delete `.claude-personal/mark/reference-CLAUDE.md` once nothing more is being taken from it. It remains in the alternative codebase.

## Phase 4: Sort and rewrite the rules

Each rule is scoped by `paths:`, so a rule whose paths do not exist in Turva never loads, and one whose paths happen to exist loads with the alternative codebase's conventions. Both are wrong until fixed.

- [ ] Keep `components.md` and `pages.md`, and rewrite them for Turva's frontend once the Storybook catalogue has been brought across, since both are written around it. Both were kept out of #69, so that pull request holds less that Turva cannot use yet, and come in a pull request of their own at the top of the stack instead. Their paths, `frontend/src/components/**` and `frontend/src/pages/**`, already match, so they load today, before Turva has a Storybook: until the port, treat what they say about stories and the catalogue as where the frontend is going, not as what is there. Check each remaining convention against what Turva's React and Mantine code actually does, and against `specifications/copilot-instructions.md`. Component names that only exist in the alternative codebase go.

- [x] Delete `backend.md`. It was written for a FastAPI and SQLAlchemy backend under `backend/**`, and Turva's backend is Django under `app/**` with the storage layer in `safety_file/**`. Its sections on function layout, where a test lives and expand-contract migrations are not tied to that stack, and can be ported from the alternative codebase later if they are wanted.

- [x] Delete `ci.md`. It described a merge queue, the Terraform that configures it and a draft-first pull request lifecycle, none of which Turva has. Its one general point, never to rebase a branch that has already merged, comes back with the stack recipes if it is wanted.

- [x] Rewrite `workflows.md` against Turva's three workflows and `s/lint`. Turva's own rules, such as pinning Actions to full commit SHAs, are already in `AGENTS.md` and should be referred to, not copied. Cut to the four points that are true of Turva today, scoped to `.github/workflows/**`: no `${{ }}` inside `run:`, write permissions per job, pinning to commit SHAs (referring to `AGENTS.md`), and the zizmor audit in `./s/lint` and `workflow-security.yml`.

- [x] Change `just.md` to match `justfile`. Its path is `Justfile` with a capital, so it does not load here. Turva's recipes are thin wrappers over `s/`, which the rule should say. The path is now `justfile`, and the only example is a real one, `just sd b`. It says that thin wrappers over `s/` and recipes with logic of their own are both fine, and neither is converted into the other. It keeps the rule that recipes are in alphabetical order, though the `justfile` has not been reordered to match yet.

- [x] Keep `home-details.md` with the wording about the alternative codebase removed. It has no paths, so it always loads, and it applies as it stands: Turva is public too. Rewritten so anyone can use it: any private network or VPN, placeholders such as `<the server's LAN address>` and `<the computer's VPN name>`, and "the dev box" as the example of a generic machine name.

- [x] Delete `e2e.md` and `incidents.md`. Turva has no `frontend/e2e/` and no incidents folder, so neither rule could ever load.

## Phase 5: Sort and rewrite the skills

There were 21, and 12 are left after the deletions below. Those marked `disable-model-invocation` are only run when Mark types them, which is why Claude lists fewer than are in the folder.

- [ ] Adapt the small general ones first, since they need little or nothing: `e`, `s`, `tldr`, `read-project-instructions`, `in-code-documentation`, `strong-static-typing-defensive-programming`, `fix-vs-code-problems`. `e`, `s` and `in-code-documentation` are done and committed; `in-code-documentation` covers `safety_file/`, `app/` and `frontend/src/`, and notes that `safety_file` docstrings are published to the docs site in Google style. The other four folders, and `update-docs-docs` and `update-nav`, are empty on disk. Confirm whether they were meant to be deleted, and remove the folders or restore the skills.

- [x] Delete `nst-crp` and `nst-crpf`, the commit skills for a branch that is not stacked. Turva work lands as stacked branches through `crpd`, so they had no use here.

- [x] Rewrite `crpd` for Turva. It now drives `gh stack` directly (`gh stack add`, `rebase`, `submit` and `view --json`) instead of the `just stack-*` recipes, which Turva does not have. It runs the gates `AGENTS.md` names before every commit, `./s/lint` and `./s/test`, plus `./s/frontend` for frontend work, instead of a targeted subset. The repository arguments, the merge queue, the readability scoring script and the alternative codebase's examples are gone; the examples now use Turva's hazard saving.

- [x] Port the stack recipes `f` needs, and their helper scripts. They add checks `gh stack` lacks: refusing to stack on a merged branch, a per-branch diff, and a repair when GitHub's record of the stack drifts. The recipes are at the end of `justfile`, as `stack-*`, with `stack-checkout`, `stack-refresh` and `stack-relink` as well because the others' messages point to them. Three scripts sat in `just/stack/` at first, and now sit in `s/stack/` (see the next step). The other codebase's tab titles, Python version guard, multi-repository switch and two-tier CI marks are gone, since Turva has none of them. `stack-add`, `stack-ready` and `stack-watch` were not ported, as `f` does not use them, and nor was `stack-branch-merged.sh`, which only `stack-add` called. `crpd` still drives `gh stack` directly. `f`'s permission to run `python3 scripts/stack-status.py` now names the new path. Lint passes on `justfile` and the three scripts.

- [x] Move the three stack scripts from `just/stack/` to `s/stack/`, following the decision below that Mark's scripts go in subfolders of `s/`. The `stack_scripts` variable in `justfile`, its comments and `f`'s permission now name `s/stack/`. The `just/` folder is gone.

- [ ] Test the stack recipes that change things. The read-only ones were run against the stack holding #68 and #69 and drew it correctly: `stack-help`, `stack-log`, `stack-log-long`, `stack-files` and `stack-move 2`, as were the scripts' `--check`, `--left-behind` and `--rebuild-order` and `stack-relink.py --check`. `stack-new`, `stack-update`, `stack-rebase`, `stack-submit`, `stack-sync`, `stack-fresh`, `stack-refresh` and `stack-relink` were not run, because each rewrites or pushes branches and the only stack was those two open pull requests. Try them on a throwaway stack, or on the next real one, before `f` relies on them.

- [x] Decide whether to strip the code in `s/stack/stack-status.py` that only served `stack-watch`: the `--expand`, `--diff-at` and `--numbered` options and the comments about the watch. It was left in because it is threaded through the drawing code and does no harm, but its comments describe a recipe Turva does not have. Either remove it, or port `stack-watch` and its two scripts. Ported, on 16 November 2026, because Mark wanted `just stw` locally, so the code stays and its comments are true again. `stack-watch` (`just stw`) is at the end of `justfile`, taken from the alternative codebase's latest version, with its `initialise`, Python guard and `STACK_REPO` lines removed as for the other stack recipes. Its two scripts, `stack-watch-outcome.sh` and `vscode-code.sh`, are in `s/stack/`, with their bats tests in `s/stack/tests/`, all 19 passing. `stack-ready` (`just strd`) came too, since the watcher's `a` key runs it; its note about starting a heavy CI tier went, since Turva's CI has one tier. A run without a terminal drew the stack of five branches with their pull requests and CI marks; the keys have not been tried.

- [ ] Decide whether to port the readability scoring script that `crpd` used to score each pull request description before posting it.

- [x] Delete `nst-follow-the-plan-document`, which follows a plan without stacking.

- [x] Rewrite `f`, which follows a plan as a stack of branches, one per reviewable unit. Point it at `plans/`, and remove its references to the deleted skills. The `just stack-*` recipes it calls now exist. The rest of the alternative codebase in it is gone too. Plans are found under `plans/`. The bottom unit must be safe on `main` rather than safe to deploy to a teaching site. The migration-chain checker and the API-diff gate, which Turva lacks, are replaced by making each Django migration with `./s/manage makemigrations` in the unit that needs it. The `xfail` example from its backend is now a general description. Permission to run `git push` is replaced by `./s/lint`, `./s/test`, `./s/frontend` and `./s/up`, with a rule that only `/crpd` pushes. Writes to an existing safety file's Git history, and changes to who can edit a safety file, are added to what stops a run. It passes lint.

- [x] Delete `run-all-tests`. It called `scripts/run-ci-checks.sh`, which Turva does not have, and `./s/lint`, `./s/test` and `./s/frontend` already are that gate.

- [ ] Rewrite `update-docs-docs` and `update-nav` for Turva's Zensical site in `docs/`, whose navigation is in `docs/mkdocs.yml`. The site has four pages today, so this is also where missing documentation gets noticed.

- [x] Delete `alert` and `ask`, which serve the alternative codebase's production alerts in Slack, and `fast-api-docs`, which documents a framework Turva does not use.

- [x] Delete `sync-copilot-config`. It copied Copilot instructions from `.github/` into `.claude/`; Turva keeps them in `specifications/copilot-instructions.md` and uses `AGENTS.md` as the single entry point.

- [ ] Delete `.claude/sync-manifest.json`, which only that skill read.

- [x] Delete `play-finished-sound`. It ran `scripts/notification.sh`, which Turva does not have. If that script is ported in Phase 6, the hooks call it and no skill is needed.

- [x] Leave `f`, `g` and `p` out of the first commit of `.claude-personal/mark/`. `f` still runs on the alternative codebase's stack recipes and paths, so it does not work in Turva yet, and `g` and `p` exist to feed it: `p` writes plans for `f` to build and `g` settles them before `f` runs. Commit the three together once `f` is rewritten. Done: they are committed with `CLAUDE.md` and the stack recipes, in the branch above #69.

## Phase 6: Hooks and settings

These stay in the ignored `.claude/` for now. They run commands, so they are the part most able to surprise somebody else.

- [x] Port `scripts/notification.sh` and its sound file from the alternative codebase, or remove the three hooks in `.claude/settings.json` that call it. Until one of those is done, every finished turn reports a hook error, because Turva has no `scripts/` folder. Ported to `s/notification/`, following the decision below on where Mark's scripts live, and taken from the alternative codebase's latest version, in which the Linux box never connects to the Mac: the box adds each banner to a queue file and a listener on the Mac fetches it. The Mac's side came too (the show, click-to-focus and listener scripts, and `just notify-listen-install`), so anybody can set it up from Turva alone. The queue file is the one the alternative codebase uses, so one listener on the Mac shows both repositories' banners, and the installer stops if the alternative codebase's listener is already running, since two would show every banner twice. The Quill-specific parts went: the Owl worktree, the branded app builder and the `QUILL_NOTIFY_*` names, now `TURVA_NOTIFY_*`. `s/notification/README.md` explains the set-up. The three hooks in the local `.claude/settings.json` now call `s/notification/notification.sh`. Its tests are in `s/notification/tests/notification.bats`, which needs `bats`, not yet installed on the dev box or run in CI.

- [ ] Trim the `permissions.allow` list in `.claude/settings.json` to commands Turva has. `poetry run`, `just ub`, `just uf` and `scripts/slack-reply.sh` go. The `just stack-*` entries stay, since Turva now has those recipes. `./s/lint`, `./s/test` and `./s/frontend` are candidates to add. The `deny` on merging pull requests stays: it matches `AGENTS.md`.

- [ ] Remove the two hooks that serve the alternative codebase's unattended alert bot, and their tests. They do nothing unless that bot's tmux session sets a variable, and the bot is not being ported.

- [x] Keep `tab-topic.sh`, and change the session names it recognises. It only acted in tmux sessions named after the alternative codebase's own. Done on 17 November 2026: it also acts in `claude-turva` and `claude-turva-<number>`, the sessions the `claude-session` recipe now names after the checkout's folder, and leaves the `tmux-turva-*` shells alone, with tests for each in `tab-topic.bats`. The tab reads "Claude" and the topic through a matching `set-titles-string` rule in each person's own `~/.tmux.conf`, which is not in the repository.

- [ ] Do not carry `session-start.sh` over as it is. It only runs in Claude Code on the web, where it renames `claude/*` branches to `feature/*`, copies `.env-sample` files and starts `compose.dev.yml`, none of which fit Turva. If the hooks were ever committed it would also run in the overnight routine, whose branch names are set by `specifications/nightly-triage.md`. Whether Turva needs a session-start hook of its own is a question for that routine's owner. Its check of the host's Python against a pinned version is already gone, with its three tests, on 16 November 2026: it ran the alternative codebase's `scripts/check-python-version.sh`, which Turva does not have, so two of its tests failed once `bats` was installed.

## Phase 7: Make it clean, and agree what is shared

- [ ] Get `./s/lint` passing on `.claude-personal/mark/`. As copied, cspell reports 185 unknown words and markdownlint 34 findings. Most of the spelling findings are names from the alternative codebase that the earlier phases remove; what is left is fixed in the files or added to `cspell.config.json`. `AGENTS.md` says not to commit red, and `s/lint` checks untracked files as well as tracked ones.

- [x] Commit `.claude-personal/mark/`, the `link-claude` recipe and this plan. Done in #69, stacked on #68, which adds the `claude-session` and `tmux-window` recipes. Both await review. `f`, `g` and `p` were left out, as Phase 5 says. So were `.claude-personal/mark/CLAUDE.md` and the stack recipes and scripts, which came after.

- [x] Commit `.claude-personal/mark/CLAUDE.md`, the stack recipes and their scripts, and the `f`, `g` and `p` skills as the next branch in the stack, above #69.

- [x] Keep the personal files in `.claude-personal/mark/`, one folder per person, and make `link-claude` take a name: `just lc mark` links `.claude-personal/mark/` into `.claude/`, and anyone else can keep their own set in `.claude-personal/<name>/` and link it the same way. The name must be lower-case letters, so it can only reach a folder directly inside `.claude-personal/`, and the recipe checks every part exists before linking any of them. The `.gitignore` rule for the local reference copy covers `/.claude-personal/*/reference-CLAUDE.md`. The folder was first called `.claude-mark/`; it moved on 17 November 2026.

- [ ] Go through the result with Marcus and decide what becomes Turva's shared setup. Whatever is agreed moves from `.claude-personal/mark/` into a committed `.claude/`, with `/.claude` taken out of `.gitignore` or narrowed to the local files, and `AGENTS.md` updated, since it currently calls itself the single source of agent instructions. Whatever stays personal stays in `.claude-personal/mark/`.

- [ ] Keep `.claude-personal/` and the `link-claude` recipe after that split, for whatever stays personal. This step used to remove the personal folder and the recipe once the split was made; it changed on 17 November 2026, when the personal folder became one per person.

## Decisions

- **A tracked folder beside `.claude/`, not `.claude/` itself** - `/.claude` was ignored on purpose in the house-style scaffold, and a committed `.claude/` is live for everyone who opens the repository, including the overnight routine. There is no standard way to commit Claude Code files that only one person loads, so the files sit in `.claude-personal/<name>/` and are linked in locally. Phase 7 moves what is shared into `.claude/`, and the personal folders stay for the rest.

- **`AGENTS.md` stays the authority** - Turva's `CLAUDE.md` adds how Mark works and defers to `AGENTS.md` for everything about the product. The alternative codebase's `CLAUDE.md` holds both in one file because it has no `AGENTS.md`.

- **Adapt in place, not rewrite from nothing** - the copied files carry reasoning that took time to arrive at, and most of the work is removing what does not apply. Starting from the copies keeps that reasoning in view while each file is cut down.

- **This plan covers the Claude setup only** - what else to bring across from the alternative codebase is for later plans, written once this setup is in place to write them with.

- **Mark's scripts live in subfolders of `s/`, one per topic** - `s/stack/`, `s/notification/` and so on, including scripts a Claude hook calls. Decided by Mark on 16 November 2026, for now, replacing two earlier choices: `just/<topic>/` for scripts that recipes call, and `.claude/hooks/` for hook scripts, which is git-ignored and so would never have been tracked. The top level of `s/` stays a flat set of commands that anyone runs, such as `./s/up` and `./s/test`, and a new one there is agreed with Marcus first. Subfolders keep the two apart without a second scripts folder at the root. Mark's recipes stay in `justfile` and call the scripts by path.

<!-- cspell:words crpd crpf oasdiff strd xfail -->
