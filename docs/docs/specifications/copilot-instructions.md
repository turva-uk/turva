# Turva AI Agent Instructions

## Project Overview

Turva is a **clinical safety management platform** for healthcare IT systems. It digitizes clinical risk management for medical software, replacing spreadsheet-based workflows. The system manages hazards, risk assessments, mitigations, audit trails, and regulatory compliance evidence using the VMPT stack (Version control, Markdown, Placeholders, Templates).

**Domain context**: This is safety-critical healthcare software. Clinical Safety Officers (CSOs) assess risks, track hazards, and ensure patient safety. The system supports DCB0129/DCB0160 compliance for NHS Digital standards.

## Reading material

- [spec](spec.md)
- [roadmap](roadmap.md)

## Architecture

**Monorepo** with three Docker services orchestrated via docker-compose and Caddy reverse proxy:

- **frontend/** - React 19 + TypeScript + Vite + Mantine UI (port 5173)
- **api/** - FastAPI + Ormar ORM + PostgreSQL (port 8000)
- **docs/** - MkDocs documentation (currently commented out)

```
http://localhost → Caddy → /api/* → api:8000
                         → /*     → frontend:5173
```

### Key Backend Patterns

**Dynamic endpoint registration**: The [api/src/endpoints/\_\_init\_\_.py](../api/src/endpoints/__init__.py) walks the file tree and auto-registers FastAPI routers. Each `.py` file with a `router` object becomes an endpoint at `/<folder_path>/<filename>`. Example: [endpoints/auth/login.py](../api/src/endpoints/auth/login.py) → `/auth/login/`.

**Authentication flow**:
1. Session-based auth using Starlette sessions (not JWT)
2. [TurvaAuthenticationBackend](../api/src/authentication/middleware.py) validates session cookies on every request
3. Sessions stored in PostgreSQL via [models/session.py](../api/src/models/session.py)
4. Password hashing with Argon2 in [models/user.py](../api/src/models/user.py)

**Database**: 
- Ormar ORM with async PostgreSQL (production) or SQLite (testing)
- Alembic migrations in [api/src/alembic/](../api/src/alembic/)
- [DateFieldsMixins](../api/src/models/_database.py) adds `created_date`/`updated_date` to all models
- Test isolation: each test gets fresh DB via [conftest.py](../api/src/tests/conftest.py) fixtures

**Configuration**: [config.py](../api/src/config.py) uses type-safe env var parsing with `parseString`/`parseInteger` helpers. Raises `ConfigurationError` on missing required vars.

### Key Frontend Patterns

**API communication**: 
- [withFetch](../frontend/src/common/withFetch.ts) wraps fetch with automatic snake_case→camelCase conversion, date parsing, and error handling
- [useREST](../frontend/src/hooks/useREST.ts) hook provides loading states and automatic camelCase→snake_case for requests
- All API calls use `credentials: 'include'` for session cookies

**State management**:
- [UserAuthContext](../frontend/src/app/contexts/UserAuthContext.tsx) stores user in localStorage and React context
- [ConfigurationContext](../frontend/src/app/contexts/ConfigurationContext.tsx) for app-wide config
- No external state management library

**Routing**: React Router v7 with [RequiresVerifiedLogin](../frontend/src/app/App.tsx) wrapper for protected routes. Unverified users redirect to `/auth/verify-notice`.

**UI/Testing**:
- Mantine v8 components throughout
- Storybook for component development (`yarn storybook`)
- Vitest with @testing-library/react for unit tests
- [MockUserAuthProvider](../frontend/src/app/contexts/UserAuthContext.tsx) for story/test contexts

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
