# Turva AI Agent Instructions

## Project Overview

Turva is a **clinical safety management platform** for healthcare IT systems. It digitizes clinical risk management for medical software, replacing spreadsheet-based workflows. The system manages hazards, risk assessments, mitigations, audit trails, and regulatory compliance evidence using the VMPT stack (Version control, Markdown, Placeholders, Templates).

**Domain context**: This is safety-critical healthcare software. Clinical Safety Officers (CSOs) assess risks, track hazards, and ensure patient safety. The system supports DCB0129/DCB0160 compliance for NHS Digital standards.

## Reading material

- **[Core Specification](core-specification.md)** - Essential domain model and principles
- **[LLM Strategy](llm-strategy.md)** - AI integration approach
- **[Federation](federation.md)** - Cross-organizational safety case sharing
- **[Architecture Principles](architecture-principles.md)** - Design principles
- **[Roadmap](roadmap.md)** - Implementation status

## Architecture

See **[Architecture Principles](architecture-principles.md)** for design philosophy.

### Current Stack

- **Frontend**: React 19 + TypeScript + Vite + Mantine UI
- **Backend**: FastAPI + Ormar ORM + PostgreSQL
- **Infrastructure**: Docker Compose + Caddy reverse proxy

**Key patterns**:
- Session-based auth (not JWT) - sessions in PostgreSQL
- Automatic snake_case ↔ camelCase conversion at API boundary
- Dynamic endpoint registration (file tree → URL structure)
- All API operations async (async/await pattern)

Implementation details live in the codebase - see README files in `api/` and `frontend/` directories

## Development Workflows

**Start development**:

```bash
./s/up         # Start all services (builds automatically)
./s/logs api   # Follow API logs
./s/restart frontend  # Restart specific service
./s/down       # Stop everything
./s/clean      # Nuclear option - removes volumes
```

**API testing**: From [api/src/](../api/src/):

```bash
coverage run -m pytest . --cov-config=../pyproject.toml
coverage html  # Generates htmlcov/ report
```

- Tests require `.env.test` file (see [conftest.py](../api/src/tests/conftest.py))
- Each test gets isolated SQLite DB via pytest-asyncio fixtures

**Frontend testing**:

```bash
yarn test              # Watch mode
yarn test:ci           # Single run
yarn test:coverage     # Generate coverage
```

**Database migrations** (from [api/src/](../api/src/)):

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

**Template system**: [example_template/build.py](../example_template/build.py) processes Jinja2 templates from `template/*.md` with `values.json` variables. Generates clinical safety documentation.

## Project-Specific Conventions

**Case conversion**: Backend uses `snake_case`, frontend uses `camelCase`. Conversion happens automatically in `withFetch`/`useREST` - never manually convert.

**Date handling**: [parseDates.ts](../frontend/src/common/parseDates.ts) recursively converts ISO strings to Date objects from API responses.

**Error responses**: API returns `{detail: string, title?: string, statusCode: string, code?: string}`. Frontend [restUtils.ts](../frontend/src/common/restUtils.ts) throws `UnauthenticatedError` for 401s.

**Module imports**: Frontend uses `#*` import alias (see [package.json imports](../frontend/package.json)) for workspace-relative paths. Example: `#src/pages/...`.

**Coverage exclusions**: [pyproject.toml](../api/pyproject.toml) excludes `tests/`, `alembic/`, `models/`, `async_database_utils.py` from coverage.

**Email validation**: Uses `email-validator` library with `TEST_ENVIRONMENT = True` flag in tests.

## Critical Context

**Do not use JWT** - This is session-based auth. Sessions stored in PostgreSQL, validated by middleware.

**Always use Ormar async methods** - No raw SQL unless absolutely necessary. Models use `await User.objects.get()`, not Django-style synchronous queries.

**Frontend routing guards** - Check `isVerified` flag. Unverified users can't access dashboard even if authenticated.

**Never commit `.env` files** - Use `.env.test` for testing (not tracked). Production uses environment variables.

**Container development** - Code changes hot-reload via Docker volumes. No need to rebuild unless dependencies change.

**Database schema management** - PostgreSQL uses `search_path` for schema isolation (see `api/src/models/_database.py` server settings).
