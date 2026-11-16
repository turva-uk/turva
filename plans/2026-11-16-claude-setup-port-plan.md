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

- [ ] Read `.claude-personal/mark/reference-CLAUDE.md` end to end and sort each section into three groups: how Mark works with Claude whatever the project (reply style, plan discipline, commit habits, British English, no em dashes), facts about the alternative codebase that have a Turva equivalent (commands, branch rules, where documents live), and facts that have none (its clinical record services, its alert watcher, the stack recipes, brands).

- [ ] Write `.claude-personal/mark/CLAUDE.md` from the first two groups. It defers to `AGENTS.md` for the stack, the safety invariants, the `./s/` scripts and the approval rules, and does not restate them: two copies would drift, and `AGENTS.md` is the one Marcus and the overnight routine read. Where the alternative codebase's habit and `AGENTS.md` disagree, `AGENTS.md` wins and the difference is recorded under Decisions below.

- [ ] Settle the Git workflow wording. The alternative codebase requires `feature/*` branches, stacked pull requests and a merge queue. `AGENTS.md` currently allows direct commits to `main` and says to move to branches and pull requests when more contributors join. With two people now committing, that condition may already be met, which is a question for Marcus, not something to assume in this file.

- [ ] Add `CLAUDE.md` to the `link-claude` recipe, linking `.claude/CLAUDE.md` to `.claude-personal/mark/CLAUDE.md`, and run it. Only do this once the Turva version is written, so the copied version is never live in this repository.

- [ ] Delete `.claude-personal/mark/reference-CLAUDE.md` once nothing more is being taken from it. It remains in the alternative codebase.

## Phase 4: Sort and rewrite the rules

Each rule is scoped by `paths:`, so a rule whose paths do not exist in Turva never loads, and one whose paths happen to exist loads with the alternative codebase's conventions. Both are wrong until fixed.

- [ ] Keep `components.md` and `pages.md`, and rewrite them for Turva's frontend once the Storybook catalogue has been brought across, since both are written around it. Both were kept out of #69, so that pull request holds less that Turva cannot use yet, and come in a pull request of their own at the top of the stack instead. Their paths, `frontend/src/components/**` and `frontend/src/pages/**`, already match, so they load today, before Turva has a Storybook: until the port, treat what they say about stories and the catalogue as where the frontend is going, not as what is there. Check each remaining convention against what Turva's React and Mantine code actually does, and against `specifications/copilot-instructions.md`. Component names that only exist in the alternative codebase go.

- [x] Delete `backend.md`. It was written for a FastAPI and SQLAlchemy backend under `backend/**`, and Turva's backend is Django under `app/**` with the storage layer in `safety_file/**`. Its sections on function layout, where a test lives and expand-contract migrations are not tied to that stack, and can be ported from the alternative codebase later if they are wanted.

- [x] Delete `ci.md`. It described a merge queue, the Terraform that configures it and a draft-first pull request lifecycle, none of which Turva has. Its one general point, never to rebase a branch that has already merged, comes back with the stack recipes if it is wanted.

- [ ] Rewrite `workflows.md` against Turva's three workflows and `s/lint`. Turva's own rules, such as pinning Actions to full commit SHAs, are already in `AGENTS.md` and should be referred to, not copied.

- [ ] Change `just.md` to match `justfile`. Its path is `Justfile` with a capital, so it does not load here. Turva's recipes are thin wrappers over `s/`, which the rule should say.

- [ ] Keep `home-details.md` with the wording about the alternative codebase removed. It has no paths, so it always loads, and it applies as it stands: Turva is public too.

- [x] Delete `e2e.md` and `incidents.md`. Turva has no `frontend/e2e/` and no incidents folder, so neither rule could ever load.

## Phase 5: Sort and rewrite the skills

There were 21, and 12 are left after the deletions below. Those marked `disable-model-invocation` are only run when Mark types them, which is why Claude lists fewer than are in the folder.

- [ ] Adapt the small general ones first, since they need little or nothing: `e`, `s`, `tldr`, `read-project-instructions`, `in-code-documentation`, `strong-static-typing-defensive-programming`, `fix-vs-code-problems`.

- [x] Delete `nst-crp` and `nst-crpf`, the commit skills for a branch that is not stacked. Turva work lands as stacked branches through `crpd`, so they had no use here.

- [x] Rewrite `crpd` for Turva. It now drives `gh stack` directly (`gh stack add`, `rebase`, `submit` and `view --json`) instead of the `just stack-*` recipes, which Turva does not have. It runs the gates `AGENTS.md` names before every commit, `./s/lint` and `./s/test`, plus `./s/frontend` for frontend work, instead of a targeted subset. The repository arguments, the merge queue, the readability scoring script and the alternative codebase's examples are gone; the examples now use Turva's hazard saving.

- [ ] Decide whether to port the stack recipes and their helper scripts after all. They add checks `gh stack` lacks: refusing to stack on a merged branch, a per-branch diff, and a repair when GitHub's record of the stack drifts. `crpd` does the first two by hand for now.

- [ ] Decide whether to port the readability scoring script that `crpd` used to score each pull request description before posting it.

- [x] Delete `nst-follow-the-plan-document`, which follows a plan without stacking.

- [ ] Rewrite `f`, which follows a plan as a stack of branches, one per reviewable unit. Point it at `plans/`, and remove its references to the deleted skills.

- [x] Delete `run-all-tests`. It called `scripts/run-ci-checks.sh`, which Turva does not have, and `./s/lint`, `./s/test` and `./s/frontend` already are that gate.

- [ ] Rewrite `update-docs-docs` and `update-nav` for Turva's Zensical site in `docs/`, whose navigation is in `docs/mkdocs.yml`. The site has four pages today, so this is also where missing documentation gets noticed.

- [x] Delete `alert` and `ask`, which serve the alternative codebase's production alerts in Slack, and `fast-api-docs`, which documents a framework Turva does not use.

- [x] Delete `sync-copilot-config`. It copied Copilot instructions from `.github/` into `.claude/`; Turva keeps them in `specifications/copilot-instructions.md` and uses `AGENTS.md` as the single entry point.

- [ ] Delete `.claude/sync-manifest.json`, which only that skill read.

- [x] Delete `play-finished-sound`. It ran `scripts/notification.sh`, which Turva does not have. If that script is ported in Phase 6, the hooks call it and no skill is needed.

- [ ] Leave `f`, `g` and `p` out of the first commit of `.claude-personal/mark/`. `f` still runs on the alternative codebase's stack recipes and paths, so it does not work in Turva yet, and `g` and `p` exist to feed it: `p` writes plans for `f` to build and `g` settles them before `f` runs. Commit the three together once `f` is rewritten.

## Phase 6: Hooks and settings

These stay in the ignored `.claude/` for now. They run commands, so they are the part most able to surprise somebody else.

- [ ] Port `scripts/notification.sh` and its sound file from the alternative codebase, or remove the three hooks in `.claude/settings.json` that call it. Until one of those is done, every finished turn reports a hook error, because Turva has no `scripts/` folder. If it is ported, it goes in `.claude/hooks/` with the other hook scripts, not in `s/`, which holds the shared project scripts.

- [ ] Trim the `permissions.allow` list in `.claude/settings.json` to commands Turva has. `poetry run`, the `just stack-*` recipes, `just ub`, `just uf` and `scripts/slack-reply.sh` go. `./s/lint`, `./s/test` and `./s/frontend` are candidates to add. The `deny` on merging pull requests stays: it matches `AGENTS.md`.

- [ ] Remove the two hooks that serve the alternative codebase's unattended alert bot, and their tests. They do nothing unless that bot's tmux session sets a variable, and the bot is not being ported.

- [x] Keep `tab-topic.sh`, and change the session names it recognises. It only acted in tmux sessions named after the alternative codebase's own. Done on 17 November 2026: it also acts in `claude-turva` and `claude-turva-<number>`, the sessions the `claude-session` recipe now names after the checkout's folder, and leaves the `tmux-turva-*` shells alone, with tests for each in `tab-topic.bats`. The tab reads "Claude" and the topic through a matching `set-titles-string` rule in each person's own `~/.tmux.conf`, which is not in the repository.

- [ ] Do not carry `session-start.sh` over as it is. It only runs in Claude Code on the web, where it renames `claude/*` branches to `feature/*`, copies `.env-sample` files and starts `compose.dev.yml`, none of which fit Turva. If the hooks were ever committed it would also run in the overnight routine, whose branch names are set by `specifications/nightly-triage.md`. Whether Turva needs a session-start hook of its own is a question for that routine's owner.

## Phase 7: Make it clean, and agree what is shared

- [ ] Get `./s/lint` passing on `.claude-personal/mark/`. As copied, cspell reports 185 unknown words and markdownlint 34 findings. Most of the spelling findings are names from the alternative codebase that the earlier phases remove; what is left is fixed in the files or added to `cspell.config.json`. `AGENTS.md` says not to commit red, and `s/lint` checks untracked files as well as tracked ones.

- [ ] Commit `.claude-personal/mark/`, the `link-claude` recipe and this plan.

- [x] Keep the personal files in `.claude-personal/mark/`, one folder per person, and make `link-claude` take a name: `just lc mark` links `.claude-personal/mark/` into `.claude/`, and anyone else can keep their own set in `.claude-personal/<name>/` and link it the same way. The name must be lower-case letters, so it can only reach a folder directly inside `.claude-personal/`, and the recipe checks every part exists before linking any of them. The `.gitignore` rule for the local reference copy covers `/.claude-personal/*/reference-CLAUDE.md`. The folder was first called `.claude-mark/`; it moved on 17 November 2026.

- [ ] Go through the result with Marcus and decide what becomes Turva's shared setup. Whatever is agreed moves from `.claude-personal/mark/` into a committed `.claude/`, with `/.claude` taken out of `.gitignore` or narrowed to the local files, and `AGENTS.md` updated, since it currently calls itself the single source of agent instructions. Whatever stays personal stays in `.claude-personal/mark/`.

- [ ] Keep `.claude-personal/` and the `link-claude` recipe after that split, for whatever stays personal. This step used to remove the personal folder and the recipe once the split was made; it changed on 17 November 2026, when the personal folder became one per person.

## Decisions

- **A tracked folder beside `.claude/`, not `.claude/` itself** - `/.claude` was ignored on purpose in the house-style scaffold, and a committed `.claude/` is live for everyone who opens the repository, including the overnight routine. There is no standard way to commit Claude Code files that only one person loads, so the files sit in `.claude-personal/<name>/` and are linked in locally. Phase 7 moves what is shared into `.claude/`, and the personal folders stay for the rest.

- **`AGENTS.md` stays the authority** - Turva's `CLAUDE.md` adds how Mark works and defers to `AGENTS.md` for everything about the product. The alternative codebase's `CLAUDE.md` holds both in one file because it has no `AGENTS.md`.

- **Adapt in place, not rewrite from nothing** - the copied files carry reasoning that took time to arrive at, and most of the work is removing what does not apply. Starting from the copies keeps that reasoning in view while each file is cut down.

- **This plan covers the Claude setup only** - what else to bring across from the alternative codebase is for later plans, written once this setup is in place to write them with.

- **Each ported script's home is decided when it is ported** - there is no blanket rule. A hook, or a script a hook calls, goes with the other Claude files in `.claude/hooks/`. A project tool everyone would use, for building, testing, linting or running Turva, belongs in `s/`, and adding one there is agreed with Marcus first. Mark's own tooling lives in `justfile`, in the recipe or in a script it calls. Later plans that port scripts name each one's home in its step.

<!-- cspell:words crpd crpf -->
