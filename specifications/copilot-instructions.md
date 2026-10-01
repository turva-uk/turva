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

### Current Stack

- **Interface**: Jinja2 templates server-rendered by FastAPI, progressively enhanced with HTMX. There is no separate frontend build
- **Backend**: FastAPI + Ormar ORM + PostgreSQL
- **Safety file storage**: Git repositories on disk, each containing a Zensical site
- **Document output**: Zensical build, then WeasyPrint over the built HTML for PDF
- **Infrastructure**: Docker Compose + Caddy reverse proxy

**Key patterns**:

- Session-based auth (not JWT) - sessions in PostgreSQL
- Dynamic endpoint registration (file tree → URL structure)
- All API operations async (async/await pattern)
- Caddy passes the whole URL space to FastAPI, which owns its routing

Implementation details live in the codebase - see the README in `api/`.

## Development Workflows

**Start development**:

```bash
./s/up         # Start all services (builds automatically)
./s/logs api   # Follow API logs
./s/restart api  # Restart specific service
./s/down       # Stop everything
./s/clean      # Nuclear option - removes volumes
```

**Testing**: the whole suite runs in the container.

```bash
docker compose exec api pytest /app/src        # 42 tests: 21 unit, 21 integration
docker compose exec api pytest /app/src/tests/unit
```

- Tests load `.env.test` with `override=True`, which is required because docker-compose injects `api/.env` into the container. Removing `override=True` makes every integration test 404
- Each test gets an isolated SQLite DB via pytest-asyncio fixtures

**Dependencies**: declarations live in `api/requirements.in` and `api/requirements.dev.in`; the `.txt` files are generated locks.

```bash
./s/lock       # Regenerate locks after editing a .in file. Commit both together
```

Never hand-edit a `.txt` lock, and never add a dependency to only the lock.

**Database migrations** (from [api/src/](../api/src/)):

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

**Documentation**:

```bash
./s/docs       # or: cd docs && zensical serve -a localhost:8001
```

**Template system**: [example_template/build.py](../example_template/build.py) processes Jinja2 templates from `template/*.md` with `values.json` variables. This is the seed of the per-project safety file template.

## Project-Specific Conventions

**Prettier must not touch `.html`** - Jinja2 templates live there and Prettier mangles `{% %}` and `{{ }}`. The exclusion is deliberate and noted in `.pre-commit-config.yaml`.

**British English** - cspell is configured for `en-GB`.
<!-- cspell:ignore rigor judgment defense -->

Write "rigour" not "rigor", "judgement" not "judgment", "defence" not "defense". Note that the adjective "rigorous" is correct in British English - only the noun takes "-our". The directive above is what lets this paragraph name the spellings it rejects; do not add them to the dictionary.

**Ruff config is `ruff.toml` at the repo root only** - it sets `src = ["api/src"]` so isort can resolve first-party modules. Do not reintroduce a `[tool.ruff]` section in `api/pyproject.toml`; the duplicate caused silent import reshuffling.

**Coverage exclusions**: [pyproject.toml](../api/pyproject.toml) excludes `tests/`, `alembic/`, `models/`, `async_database_utils.py` from coverage.

**Email validation**: Uses `email-validator` library with `TEST_ENVIRONMENT = True` flag in tests.

## Critical Context

**Git is the system of record** - see above. This is the most common thing to get wrong.

**Do not use JWT** - This is session-based auth. Sessions stored in PostgreSQL, validated by middleware.

**Always use Ormar async methods** - No raw SQL unless absolutely necessary. Models use `await User.objects.get()`, not Django-style synchronous queries.

**Routing guards** - Check the `isVerified` flag. Unverified users can't access the dashboard even if authenticated.

**Never commit `.env` files** - Use `.env.test` for testing (not tracked). Production uses environment variables.

**Container development** - Code changes hot-reload via Docker volumes. No need to rebuild unless dependencies change.

**Database schema management** - PostgreSQL uses `search_path` for schema isolation (see `api/src/models/_database.py` server settings).

**GitHub Actions are SHA-pinned** - every `uses:` has a full commit SHA and a `# vX.Y.Z` comment. Confirm the current latest tag from the action's repo before bumping; never pin from memory.
