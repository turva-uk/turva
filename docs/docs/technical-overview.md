# Technical Overview

Turva is a containerised web application built around Git as the system of record for clinical safety evidence.

## Architecture

### Interface

Server-rendered HTML from Django templates, progressively enhanced with [HTMX](https://htmx.org/). There is no separate frontend build or client-side framework: the application that enforces the business rules also renders the pages, so each screen is written once. HTMX is vendored and served from the application rather than loaded from a CDN, so no third-party host has to be reachable for a page to work.

### Application

Django 6.1 with PostgreSQL via psycopg 3. Views are synchronous, which suits an application whose expensive operations - Git and PDF generation - are blocking. Django supplies authentication, sessions, password reset, forms and an admin interface, all of which phase one needs; see [ADR 0001](https://github.com/turva-uk/turva/blob/main/specifications/adr/0001-use-django-for-phase-one.md).

### Safety file storage

Each Clinical Safety Management File is its own Git repository on disk, containing a Zensical documentation site. The database indexes those repositories so they can be listed, searched, and permission-checked; the repository remains the source of truth. The web application hides the Git operations behind an ordinary web interface.

### Reverse Proxy

Caddy serves as the reverse proxy, passing the whole URL space through to Django, which owns its own routing, and setting `X-Forwarded-Proto` so Django knows the original request was HTTPS. Configured via `Caddyfile`.

### Authentication

Session-based authentication with Argon2 password hashing. Sessions are stored in PostgreSQL and validated by Django's own middleware. Email addresses are confirmed before an account can create or edit a safety file, so that a safety decision is attributable to someone who demonstrably controls the address it is recorded against.

### Containerization

Docker Compose orchestrates three services: `web`, `postgres`, and the Caddy reverse proxy. The application container runs as a non-root user. Scripts in the `s/` directory provide convenient commands (`up`, `down`, `logs`, `restart`, `clean`).

## Development Tools

### Code Quality

- **Prettier** - Automatic formatting for markdown, JSON, YAML, and CSS. HTML templates are excluded, as Prettier mangles Django and Jinja2 template syntax
- **Ruff** - Fast Python linter and formatter (replaces Black, Flake8, isort)
- **Markdownlint** - Markdown style checking
- **Code Spell Checker** - Spell checking with custom dictionary (`cspell.config.json`)
- **Pre-commit** - Git hooks enforce spelling, formatting, and linting before commits

### Testing

- pytest with pytest-django, against PostgreSQL rather than SQLite. Testing on a different engine from the one deployed is a false signal: it is how a PostgreSQL connection regression once reached `main` with every test green

### Database

PostgreSQL throughout, including tests. pytest-django creates and destroys a separate test database, so development data is untouched.

The database holds users, sessions and an index over the safety file repositories. It is rebuildable from those repositories and is not the system of record.

## CI/CD Pipeline

### Non-main Branch Workflow

Automated quality checks run on every push to feature branches and pull requests:

- **Styling**: Pre-commit hooks enforce code formatting (Ruff), markdown linting, spell checking, and YAML validation
- **Safety file storage layer**: tested on its own, with no database or container, so a break in the architectural core fails fast
- **Django tests**: the full suite in Docker against PostgreSQL, plus Django's `check --deploy` audit run against production-like settings, and a build of the demo safety file end to end

Caching for virtual environments, pip packages, and pre-commit hooks speeds up subsequent runs.

### Main Branch Workflow

Builds the Zensical documentation site and deploys it to GitHub Pages.

### Optimisations

- Concurrency groups cancel in-progress runs when new commits are pushed to the same branch
- Aggressive caching for dependencies, pre-commit hooks, and build artifacts
- 15-20 minute timeouts prevent runaway jobs
- Every GitHub Action is pinned to a full commit SHA with a version comment
