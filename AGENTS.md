# Agent Instructions

Turva is a platform for managing clinical safety evidence for healthcare IT systems - hazards, risk assessments, mitigations and safety cases, with a regulatory-grade audit trail. It is not clinical decision support, does not process patient data, and does not replace a Clinical Safety Officer. It is safety-critical by consequence: a defect here can cause an unsafe system to be deployed in the belief that it is safe.

This file is the entry point for AI coding agents. Read it before changing anything.

## Read First

- [specifications/phase-one-scope.md](specifications/phase-one-scope.md) - what the funded build delivers by Christmas. Start here; `roadmap.md` is far wider than current scope
- [specifications/architecture-principles.md](specifications/architecture-principles.md) - especially "Git Is the System of Record"
- [specifications/safety-file-layout.md](specifications/safety-file-layout.md) - the on-disk contract for a safety file
- [specifications/adr/](specifications/adr/) - decisions and their reasoning
- [specifications/core-specification.md](specifications/core-specification.md) - domain model and risk scales
- [specifications/copilot-instructions.md](specifications/copilot-instructions.md) - stack detail, conventions, and known traps
- [SAFETY.md](SAFETY.md) - Turva's own hazards and safety status
- [README.md](README.md) - setup
- [pacharanero/house-style](https://github.com/pacharanero/house-style) - adopted cross-repo standards

## Current state

The framework is changing. [ADR 0001](specifications/adr/0001-use-django-for-phase-one.md) records the decision to rebuild on **Django**; the code in `api/` is still FastAPI and has not been ported yet. Specifications and docs that name FastAPI are stale pending that work.

`safety_file/` is the Git storage layer and is already in place. It has no framework imports and is not affected by the port.

## Core Invariants

- **Git is the system of record.** Each Clinical Safety Management File is its own Git repository on disk holding a Zensical site. PostgreSQL is an index over those repositories and must be rebuildable from them. No safety evidence may exist only in a database table. If you are adding a table as the authoritative home for safety content, stop and re-read the architecture principles.
- **Risk level is derived, never entered.** Severity and likelihood are captured; risk level is calculated. No code path may let a user set a risk level directly. This logic requires complete test coverage - see TH-008 in `SAFETY.md`.
- **The audit trail is attributable and append-only.** Changes create new commits attributed to the acting user. Never rewrite the history of a safety file repository.
- **Session-based auth, not JWT.** Sessions live in PostgreSQL and are validated by middleware.
- **Generated files are not hand-edited.** `api/requirements*.txt` and `docs/requirements.txt` are locks; edit the `.in` files and run `s/lock`. `docs/hazards/index.md` inside a safety file is generated on every save.
- **`safety_file/` imports no web framework.** That is what makes it testable without a server and what let it survive the FastAPI-to-Django change. Keep it that way.
- **Commit author is always explicit.** Never let Git fall back to global config, `$USER`, or a service account for a safety file commit.
- **Prettier must not touch `.html`.** Jinja2 templates live there and Prettier mangles `{% %}` and `{{ }}`. Do not add `html` to `types_or` in `.pre-commit-config.yaml`.
- **British English.** cspell runs with `en-GB`.
- **One ruff config**, `ruff.toml` at the repo root. It sets `src = ["api/src"]`. Do not reintroduce `[tool.ruff]` in `api/pyproject.toml`.
- **GitHub Actions are pinned to full commit SHAs** with a `# vX.Y.Z` comment. Confirm the current latest tag from the action's own repo before bumping; never pin from memory.

## Workflow

```sh
./s/up         # start the stack
./s/test       # both suites: safety_file (host) and api (container)
./s/lint       # everything CI enforces
./s/lock       # regenerate dependency locks after editing a .in file
./s/docs       # serve the docs site locally
./s/seed-demo  # build the demo safety file (also an end-to-end storage test)
```

## Before Every Commit

```sh
./s/lint      # pre-commit --all-files, then the Zizmor Actions audit
./s/test      # 152 tests: 110 in safety_file, 42 in api
```

Do not commit red. CI runs the same checks.

## Git Workflow

- Commit and push each validated coherent parcel; do not leave completed work only locally.
- Direct commits to `main` are currently permitted - the project has one active contributor. Use conventional commit messages (`feat(area):`, `fix:`, `docs:`, `chore(deps):`, `ci:`).
- Move to a descriptive branch and PR when more contributors join or `main` becomes protected.
- Ask if the appropriate path is unclear.

## Assurance

- Follow the house-style [class-wide fix directive](https://github.com/pacharanero/house-style/blob/main/agents.md#fix-the-class-not-just-the-instance): find the mechanism, fix it at the shared boundary, test representative paths, and report what you did not fix.
- Review the diff and the validation output after agent changes. Several problems in this repo arose from plausible-looking configuration that was never exercised: an unpinned dependency file silently overriding a pinned one, a test harness that could not override its own environment, a docs link to a path that did not exist.
- For anything touching the risk matrix, the audit trail, permissions, or AI-generated safety content, update [SAFETY.md](SAFETY.md) in the same commit or state why no change is needed.

## Approval Required

Ask before publishing releases, deleting branches, force-pushing, changing secrets, closing or merging pull requests, bypassing branch protection or deployment approvals, or taking any externally visible action.

Never commit a `.env` file. Never put real patient data, credentials, or a real organisation's unpublished safety case into this repository or into a test fixture.
