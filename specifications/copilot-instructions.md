# Turva AI Agent Instructions

## Project Overview

Turva is a **clinical safety management platform** for healthcare IT systems. It digitizes clinical risk management for medical software, replacing spreadsheet-based workflows. The system manages hazards, risk assessments, mitigations, audit trails, and regulatory compliance evidence.

**Domain context**: This is safety-critical healthcare software. Clinical Safety Officers (CSOs) assess risks, track hazards, and ensure patient safety. The system supports DCB0129/DCB0160 compliance for NHS Digital standards.

## Reading material

Read in this order:

- **[Phase One Scope](phase-one-scope.md)** - what the funded build delivers, and what it defers. Start here
- **[Core Specification](core-specification.md)** - essential domain model and principles
- **[Architecture Principles](architecture-principles.md)** - design principles, including Git as the system of record
- **[LLM Strategy](llm-strategy.md)** - AI integration approach
- **[Federation](federation.md)** - cross-organizational safety case sharing
- **[Roadmap](roadmap.md)** - implementation status, much wider than the funded build

## Architecture

See **[Architecture Principles](architecture-principles.md)** for design philosophy.

### The thing to understand first

**Each Clinical Safety Management File is its own Git repository on disk, holding a Zensical documentation site.** Git is the system of record for safety evidence; PostgreSQL is an index over those repositories and must be rebuildable from them. No safety evidence may exist only in a database table. The web application performs the Git operations so the CSO never sees a commit.

This is not a conventional database-backed CRUD application. If you are about to add a `hazards` table as the authoritative home for hazard text, stop and re-read `architecture-principles.md`.

### The second thing

**It is a monolith, deliberately.** One Django process renders the HTML, enforces the rules and runs Git. There is no separate frontend and no general-purpose HTTP API - API-first was withdrawn as a principle in [ADR 0002](adr/0002-monolith-over-api-first.md).

So: do not add a serialisation layer, a JSON representation of a safety artefact, or a versioned endpoint. HTMX views return HTML fragments, not JSON. `/healthz/` is the one JSON response and it is a monitoring probe, not a contract.

If a genuine second consumer appears, the answer is an HTTP layer over `safety_file`, and that is a decision to record in an ADR rather than to start one endpoint at a time.

### Current Stack

- **Interface**: Django templates, progressively enhanced with HTMX (vendored, not from a CDN). There is no separate frontend build
- **Backend**: Django 6.1 + PostgreSQL via psycopg 3
- **Safety file storage**: Git repositories on disk, each containing a Zensical site
- **Document output**: Zensical build, then WeasyPrint over the built HTML for PDF
- **Infrastructure**: Docker Compose + Caddy reverse proxy

**Key patterns**:

- Session-based auth (not JWT) - `django.contrib.sessions` with the database backend
- Synchronous views. Git and PDF work is blocking, which is why Django was chosen (ADR 0001)
- Caddy passes the whole URL space to Django, which owns its routing, and sets `X-Forwarded-Proto`

The Django project is `app/`, with `manage.py` at the repository root so that `app` and `safety_file` are importable siblings.

## Development Workflows

**Start development**:

```bash
./s/up          # Start all services. The primary way to run Turva locally
./s/logs web    # Follow application logs
./s/restart web # Restart one service
./s/manage      # Django management commands: migrate, makemigrations, createsuperuser
./s/psql        # A psql session against the development database
./s/down        # Stop everything
./s/clean       # Removes this project's containers and volumes. Destroys the local database
```

**Testing**: the whole suite runs in the container.

```bash
./s/test                      # both suites: 110 safety_file + 74 Django
./s/test safety_file          # host suite, no container needed
./s/test -k login             # container suite, filtered
```

- pytest-django creates and destroys the test database, named by `DB_TEST_DATABASE`. There is no `.env.test`: the previous implementation needed one and the `override=True` trap that came with it
- Tests run against **PostgreSQL**, not SQLite. The old suite used SQLite, which is how an asyncpg incompatibility reached `main` with all 42 tests green

**Dependencies**: declarations live in `app/requirements.in`, `app/requirements.dev.in` and `docs/requirements.in`; the `.txt` files are generated locks.

```bash
./s/lock       # Regenerate locks after editing a .in file. Commit both together
```

Never hand-edit a `.txt` lock, and never add a dependency to only the lock.

**Database migrations** are Django's:

```bash
./s/manage makemigrations accounts
./s/manage migrate
```

**Documentation**:

```bash
./s/docs       # or: cd docs && zensical serve -a localhost:8001
```

**Safety file templates** live in `safety-file-templates/`, rendered once at project creation by `safety_file/scaffold.py`. Not to be confused with `app/templates/`, which are Django page templates. The `example_template/` prototype that preceded both was removed; it is in Git history.

## Project-Specific Conventions

**Prettier must not touch `.html`** - Jinja2 templates live there and Prettier mangles `{% %}` and `{{ }}`. The exclusion is deliberate and noted in `.pre-commit-config.yaml`.

**British English** - cspell is configured for `en-GB`.
<!-- cspell:ignore rigor judgment defense -->

Write "rigour" not "rigor", "judgement" not "judgment", "defence" not "defense". Note that the adjective "rigorous" is correct in British English - only the noun takes "-our". The directive above is what lets this paragraph name the spellings it rejects; do not add them to the dictionary.

**Ruff config is `ruff.toml` at the repo root only** - it sets `src = ["."]` so isort resolves `app`, `demo` and `safety_file` as first-party. Do not add a `[tool.ruff]` section to `pyproject.toml`; a duplicate previously caused silent import reshuffling. `specifications/archive/` is excluded because ruff formats Python inside Markdown and rewriting archived specs would falsify them.

**`pyproject.toml` deliberately does not set `DJANGO_SETTINGS_MODULE`.** It is shared with the `safety_file` suite, which has no Django dependency and runs on the host. The container supplies it as an environment variable.

**Email configuration is `MAILERS`, not `EMAIL_*`.** Django 6.1 deprecated the latter and the two cannot coexist - reading `settings.EMAIL_BACKEND` raises once `MAILERS` is defined. Note that non-SMTP backends reject SMTP options, so `OPTIONS` is only populated for the SMTP backend.

## Critical Context

**Git is the system of record** - see above. This is the most common thing to get wrong.

**Do not use JWT** - This is session-based auth. Sessions stored in PostgreSQL, validated by middleware.

**Use the ORM, not raw SQL** unless there is a measured reason.

**Routing guards** - views check `request.user.is_verified`. An unverified user can sign in but is redirected to the verification notice rather than the dashboard.

**Never commit `.env` files** - Use `.env.test` for testing (not tracked). Production uses environment variables.

**Container development** - Code changes hot-reload via Docker volumes. No need to rebuild unless dependencies change.

**Database schema management** - PostgreSQL uses `search_path` for schema isolation, set in `DATABASES["default"]["OPTIONS"]`.

**The container runs as a non-root user** (uid 1000). Files it writes into the bind-mounted source tree, `makemigrations` output in particular, are therefore editable on the host. Do not revert it to root.

**Static files** - the manifest storage used outside DEBUG requires `collectstatic` to have run, or every `{% static %}` call raises. The Dockerfile does it at build time; DEBUG uses the plain backend so a CSS edit does not need a rebuild.

**GitHub Actions are SHA-pinned** - every `uses:` has a full commit SHA and a `# vX.Y.Z` comment. Confirm the current latest tag from the action's repo before bumping; never pin from memory.
