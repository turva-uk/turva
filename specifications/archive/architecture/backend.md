# Backend Architecture

Turva's backend is a Python application built with FastAPI, providing a REST API for the frontend. This document describes architectural patterns without prescribing specific implementations.

## Core Technologies

- **FastAPI**: Modern Python web framework with automatic API documentation
- **Ormar ORM**: Async ORM for database operations (alternative: SQLAlchemy, Tortoise ORM, raw SQL)
- **PostgreSQL**: Production database (SQLite for testing)
- **Alembic**: Database migration management

## Architectural Patterns

### Endpoint Organization

**Dynamic registration**: Endpoints are discovered by walking the file system. Each `.py` file in the `endpoints/` tree with a `router` object is registered automatically.

**Path mapping**: File structure determines URL structure. `endpoints/auth/login.py` becomes `/auth/login/`.

**Why this pattern?** Reduces boilerplate. No need to manually import and register every router. Adding a new endpoint is as simple as creating a file.

### Authentication and Authorization

**Session-based authentication**: Sessions stored in PostgreSQL, validated on every request via middleware.

**Password hashing**: Argon2 (memory-hard algorithm resistant to GPU attacks).

**Authorization**: Decorators on endpoints check user roles and permissions.

**Why sessions not JWT?** Sessions can be revoked immediately. JWTs remain valid until expiration. Clinical safety requires immediate invalidation.

### Database Layer

**Async operations**: All database queries use `async/await` for better concurrency.

**ORM abstraction**: Ormar models define schema and provide query API.

**Audit trails**: `DateFieldsMixins` adds `created_date`/`updated_date` to all models automatically.

**Why Ormar?** Simple async API, good TypeScript-like syntax, automatic migrations with Alembic. Alternatives (SQLAlchemy 2.0, Tortoise ORM) are equally valid.

### Configuration Management

**Environment variables**: All configuration from environment (12-factor app).

**Type-safe parsing**: Helper functions (`parseString`, `parseInteger`) validate and parse env vars at startup.

**Fail-fast**: Missing required configuration raises errors immediately, not at runtime when the config is first used.

### Error Handling

**Structured errors**: API returns consistent error format:

```json
{
  "detail": "Human-readable message",
  "title": "Error Title",
  "statusCode": "400",
  "code": "ERROR_CODE"
}
```

**HTTP status codes**: Proper use of 400 (client error), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error).

**Logging**: Errors logged with context for debugging.

## Key Design Decisions

### Why FastAPI?

- **Automatic API documentation**: OpenAPI/Swagger generated from type hints
- **Type safety**: Pydantic validates request/response data
- **Async support**: Built on Starlette, fully async
- **Performance**: Comparable to Node.js and Go

Alternatives (Flask, Django, Bottle) lack async-first design.

### Why Argon2 for Password Hashing?

- **Memory-hard**: Resistant to GPU/ASIC attacks
- **Configurable**: Can adjust time/memory cost as hardware improves
- **Recommended**: OWASP and security community recommend Argon2 over bcrypt

### Why PostgreSQL?

- **JSON support**: Store complex safety data structures
- **Full-text search**: Search hazards and mitigations
- **ACID compliance**: Essential for clinical safety audit trails
- **Schema support**: Namespace isolation for multi-tenancy

SQLite used for testing (faster, no setup required).

### Why Dynamic Endpoint Registration?

Reduces boilerplate and coupling. Adding a new endpoint doesn't require modifying central routing configuration. File system structure provides clear organization.

## Development Workflows

### Database Migrations

**Alembic** manages schema changes:

1. Edit models
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Apply migration: `alembic upgrade head`

Migrations are version-controlled and applied automatically in production.

### Testing

**pytest**: Async test support with `pytest-asyncio`

**Test isolation**: Each test gets a fresh SQLite database

**Coverage**: `coverage.py` tracks code coverage

**Why SQLite for tests?** Faster than PostgreSQL, no setup required, disposable.

### Configuration

Environment variables control behaviour:

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: Session signing key
- `TEST_ENVIRONMENT`: Boolean flag for test mode

See `config.py` for full list.

## Clinical Safety Considerations

### Audit Trails

Every database write includes:

- `created_date`: When the record was created
- `updated_date`: When the record was last modified

User actions (who did what, when) tracked explicitly.

### Data Validation

**Never trust input**: All endpoint data validated by Pydantic schemas.

**Explicit types**: No `Any` types in request/response models.

**Fail closed**: Invalid data rejected immediately.

### Immutability Where Needed

Certain records (accepted risks, closed hazards) should not be deleted, only marked as closed. This preserves the audit trail.

### Transaction Management

Database operations that must succeed or fail together use transactions. Partial updates are prevented.

## Extension Points

### Adding New Endpoints

1. Create file in `endpoints/` tree (e.g., `endpoints/projects/create.py`)
2. Define `router = APIRouter()`
3. Add endpoint handler
4. Endpoint automatically registered at `/projects/create/`

### Adding New Models

1. Define model in `models/` (inherit from `ormar.Model`)
2. Add `DateFieldsMixins` if audit trails needed
3. Generate Alembic migration
4. Apply migration

### Custom Authentication

Modify `authentication/middleware.py` to change auth logic. Current implementation checks session cookies.

### Background Tasks

FastAPI supports background tasks via `BackgroundTasks`. Use for async operations (sending emails, generating reports).

## Related Documentation

- [Architecture Overview](index.md)
- [Frontend Architecture](frontend.md)
- [Database Schema](database.md) (when created)
- [Authentication System](authentication.md) (when created)
