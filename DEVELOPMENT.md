# Turva development notes

## Running the development environment

1. Clone the repo
2. Make the convenience scripts executable, if your checkout has not preserved the mode bits:
   `chmod +x ./s/*`
3. Copy the environment template and edit as needed:
   `cp app/.env.example app/.env`
4. Start the dockerised development environment:
   `./s/up`

The application is served through Caddy at <http://localhost>. The API is also directly available at <http://localhost:8000>, where it serves its OpenAPI UI in development only.

There is no separate frontend server and no frontend build. Django renders the pages from templates in `app/templates/`, progressively enhanced with HTMX, and the development server reloads on both Python and template changes.

## Services

| Service    | Purpose                                                    | Port        |
| ---------- | ---------------------------------------------------------- | ----------- |
| `web`      | Django: pages, forms, and Git operations on safety files   | 8000        |
| `postgres` | Index and operational state (users, sessions, permissions) | 5433 → 5432 |
| `caddy`    | Reverse proxy, passes the whole URL space to the API       | 80, 443     |

## Where the safety files live

Each Clinical Safety Management File is a Git repository under
`.turva-data/safety-files/`, one directory per safety file, named for the system.
The directory is bind-mounted into the container, so the repositories are
visible on the host and ordinary Git works on them:

```bash
ls .turva-data/safety-files/
git -C .turva-data/safety-files/<slug> log --format='%h %an %s'
git -C .turva-data/safety-files/<slug> show HEAD
```

That is the point of keeping evidence in Git rather than a database: the audit
trail is inspectable with tools everyone already has, and does not depend on
Turva being running.

`.turva-data/` is gitignored - these are generated repositories and must never
be nested inside this one. `./s/up` creates the directory before starting, so
Docker cannot create it as root and leave it unwritable by the container user.

**These repositories are the system of record.** The database is an index over
them and can be rebuilt:

```bash
./s/manage reindex_safety_files --dry-run
./s/manage reindex_safety_files --owner you@example.nhs.uk
```

Nothing else in the stack needs backing up with the same care. Postgres can be
reconstructed from the repositories; the repositories cannot be reconstructed
from anything.

## Tests

```bash
./s/test                      # both suites
./s/test safety_file          # storage layer only, runs on the host
./s/test -k login             # container suite, filtered
```

The container suite requires the stack to be running; the `safety_file` suite does not. pytest-django creates and destroys a separate test database named by `DB_TEST_DATABASE`, so your development data is untouched.

Tests run against PostgreSQL, not SQLite. That is deliberate: the previous implementation tested on SQLite, which is how a PostgreSQL connection regression reached `main` with every test passing.

## Dependencies

Declarations live in `app/requirements.in`, `app/requirements.dev.in` and `docs/requirements.in`. The matching `.txt` files are fully pinned locks and are generated - do not hand-edit them.

```bash
./s/lock      # regenerate all three locks
```

Commit the `.in` change and the regenerated `.txt` together, and review the resolved dependency diff.

## Database migrations

```bash
./s/manage makemigrations accounts
./s/manage migrate
```

Migrations are **not** applied automatically on startup. Run `./s/manage migrate` after first starting the stack and after pulling a change that adds one.

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
