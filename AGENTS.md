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

## Layout

| Path                     | What it is                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `manage.py`              | Django entry point, at the root so `app` and `safety_file` are importable siblings                       |
| `app/`                   | The Django project: `config/` settings and urls, `accounts/` users and auth, `safetyfiles/`, the DRF API |
| `frontend/`              | The React + Mantine single-page interface, built with Vite                                               |
| `safety_file/`           | The Git storage layer. No framework imports, by design                                                   |
| `safety-file-templates/` | Templates a new safety file is scaffolded from. Not Django templates                                     |
| `demo/`                  | The fictional demo safety file, built through the production storage layer                               |
| `docs/`                  | The Zensical documentation site                                                                          |

[ADR 0001](specifications/adr/0001-use-django-for-phase-one.md) records why this is Django. [ADR 0003](specifications/adr/0003-react-frontend-over-drf.md) records the return to a React frontend over a DRF API, reversing [ADR 0002](specifications/adr/0002-monolith-over-api-first.md). The FastAPI implementation and the HTMX one are both in Git history.

## Core Invariants

- **Git is the system of record.** Each Clinical Safety Management File is its own Git repository on disk holding a Zensical site. PostgreSQL is an index over those repositories and must be rebuildable from them. No safety evidence may exist only in a database table. If you are adding a table as the authoritative home for safety content, stop and re-read the architecture principles.
- **Risk level is derived, never entered.** Severity and likelihood are captured; risk level is calculated. No code path may let a user set a risk level directly. This logic requires complete test coverage - see TH-008 in `SAFETY.md`.
- **The audit trail is attributable and append-only.** Changes create new commits attributed to the acting user. Never rewrite the history of a safety file repository.
- **The API calls services, never models directly.** A DRF serializer whose `create()` touches `SafetyFile.objects` bypasses the ordering that writes the repository before the index row, and produces a row for a safety file that was never written. Call `create_safety_file()`, `declare_cso()`, and the storage layer. See [ADR 0003](specifications/adr/0003-react-frontend-over-drf.md).
- **Session-based auth, not JWT.** `django.contrib.sessions` with the database backend, and DRF's `SessionAuthentication`. CSRF is enforced on unsafe methods; the client sends `X-CSRFToken`.
- **Email config is `MAILERS`, not `EMAIL_*`.** Django 6.1 deprecated the latter; defining both raises.
- **The container runs as uid 1000, not root.** Do not revert it: as root it wrote root-owned `makemigrations` output into the bind-mounted source tree.
- **Generated files are not hand-edited.** `app/requirements*.txt` and `docs/requirements.txt` are locks; edit the `.in` files and run `s/lock`. `docs/hazards/index.md` inside a safety file is generated on every save.
- **`safety_file/` imports no web framework.** That is what makes it testable without a server, and it has now survived two interface changes and one framework change untouched. Keep it that way.
- **Commit author is always explicit.** Never let Git fall back to global config, `$USER`, or a service account for a safety file commit.
- **A save uses the opened version.** Hazard HTTP writes require `expected_head` inside `repository.edit()`; never substitute a fresh HEAD and retry a stale clinical judgement. Use `repository.snapshot()` for multi-read evidence responses. Dirty trees need inspection, not an automatic reset. See [ADR 0004](specifications/adr/0004-serialised-safety-file-saves.md).
- **Prettier must not touch `.html`.** Jinja2 templates live there and Prettier mangles `{% %}` and `{{ }}`. Do not add `html` to `types_or` in `.pre-commit-config.yaml`.
- **British English.** cspell runs with `en-GB`.
- **One ruff config**, `ruff.toml` at the repo root. It sets `src = ["."]` and excludes `specifications/archive/`. Do not add `[tool.ruff]` to `pyproject.toml`.
- **GitHub Actions are pinned to full commit SHAs** with a `# vX.Y.Z` comment. Confirm the current latest tag from the action's own repo before bumping; never pin from memory.

## Workflow

```sh
./s/up         # start the stack - the primary way to run Turva locally
./s/test       # both Python suites: safety_file (host) and app (container)
./s/frontend   # the frontend gate: types, lint, format, tests, build
./s/lint       # everything CI enforces
./s/manage     # Django management commands: migrate, makemigrations, createsuperuser
./s/psql       # a psql session against the development database
./s/lock       # regenerate dependency locks after editing a .in file
./s/docs       # serve the docs site locally
./s/seed-demo  # build the demo safety file, with an account to sign in as
```

## Before Every Commit

```sh
./s/lint      # pre-commit --all-files, then the Zizmor Actions audit
./s/test      # storage tests on the host; Django/API tests against container PostgreSQL
```

Do not commit red. CI runs the same checks, on pull requests **and on pushes to
`main`** - until 2026-10-09 the quality workflow explicitly skipped `main`, which
is the branch this project commits to, so the gate existed everywhere except
where it was needed.

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
