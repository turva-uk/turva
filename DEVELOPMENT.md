# Turva development notes

## Running the development environment

1. Clone the repo
2. Make the convenience scripts executable, if your checkout has not preserved the mode bits:
   `chmod +x ./s/*`
3. Copy the environment template and edit as needed:
   `cp api/.env.example api/.env`
4. Start the dockerised development environment:
   `./s/up`

The application is served through Caddy at <http://localhost>. The API is also directly available at <http://localhost:8000>, where it serves its OpenAPI UI in development only.

There is no separate frontend server. The API renders the HTML interface from Jinja2 templates, progressively enhanced with HTMX, so Uvicorn's reloader picks up both Python and template changes.

## Services

| Service    | Purpose                                                    | Port        |
| ---------- | ---------------------------------------------------------- | ----------- |
| `api`      | FastAPI: HTML interface, JSON API, Git operations          | 8000        |
| `postgres` | Index and operational state (users, sessions, permissions) | 5433 → 5432 |
| `caddy`    | Reverse proxy, passes the whole URL space to the API       | 80, 443     |

## Tests

```bash
./s/test                          # whole suite
./s/test /app/src/tests/unit      # unit only
./s/test -k login                 # by name
```

The suite requires the stack to be running. Tests load `api/.env.test` with `override=True`, which is necessary because Docker Compose injects `api/.env` into the container; without the override the suite silently runs against development configuration.

## Dependencies

Declarations live in `api/requirements.in`, `api/requirements.dev.in` and `docs/requirements.in`. The matching `.txt` files are fully pinned locks and are generated - do not hand-edit them.

```bash
./s/lock      # regenerate all three locks
```

Commit the `.in` change and the regenerated `.txt` together, and review the resolved dependency diff.

## Database migrations

From `api/src/`:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

PostgreSQL is pinned to an exact minor version in `docker-compose.yml`. A major upgrade needs a dump and restore, not a tag change - `PGDATA` includes the major version while the volume mounts one level above it.

## Documentation

```bash
./s/docs      # Zensical with hot reload at http://localhost:8001
```

## Before committing

```bash
./s/lint
./s/test
```

CI runs the same checks. See [AGENTS.md](AGENTS.md) for the project invariants.
