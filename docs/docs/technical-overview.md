# Technical Overview

Turva is a containerised web application built around Git as the system of record for clinical safety evidence.

## Architecture

### Interface

Server-rendered HTML from Jinja2 templates, progressively enhanced with [HTMX](https://htmx.org/). There is no separate frontend build or client-side framework: the API that enforces the business rules also renders the pages, so each screen is written once.

### API

FastAPI backend with async PostgreSQL database using Ormar ORM. Alembic handles database migrations with full version control.

### Safety file storage

Each Clinical Safety Management File is its own Git repository on disk, containing a Zensical documentation site. The database indexes those repositories so they can be listed, searched, and permission-checked; the repository remains the source of truth. The web application hides the Git operations behind an ordinary web interface.

### Reverse Proxy

Caddy serves as the reverse proxy, passing the whole URL space through to the FastAPI application, which owns its own routing. Configured via `Caddyfile` for simple local development.

### Authentication

Session-based authentication with Argon2 password hashing. Custom middleware validates sessions on every request, with sessions stored in PostgreSQL.

### Containerization

Docker Compose orchestrates three services: `api`, `postgres`, and the Caddy reverse proxy. Scripts in the `s/` directory provide convenient commands (`up`, `down`, `logs`, `restart`, `clean`).

## Development Tools

### Code Quality

- **Prettier** - Automatic formatting for markdown, JSON, YAML, and CSS. Jinja2 templates are excluded, as Prettier mangles template syntax
- **Ruff** - Fast Python linter and formatter (replaces Black, Flake8, isort)
- **Markdownlint** - Markdown style checking
- **Code Spell Checker** - Spell checking with custom dictionary (`cspell.config.json`)
- **Pre-commit** - Git hooks enforce spelling, formatting, and linting before commits

### Testing

- **Backend**: pytest with async support, coverage reporting

### Database

PostgreSQL in production, SQLite for testing. Complete test isolation with fresh database per test via pytest fixtures.

## CI/CD Pipeline

### Non-main Branch Workflow

Automated quality checks run on every push to feature branches and pull requests:

- **Styling**: Pre-commit hooks enforce code formatting (Ruff), markdown linting, spell checking, and YAML validation
- **Unit Tests**: pytest suite runs in Docker containers with isolated test databases

Caching for virtual environments, pip packages, and pre-commit hooks speeds up subsequent runs.

### Main Branch Workflow

Builds the Zensical documentation site and deploys it to GitHub Pages.

### Optimisations

- Concurrency groups cancel in-progress runs when new commits are pushed to the same branch
- Aggressive caching for dependencies, pre-commit hooks, and build artifacts
- 15-20 minute timeouts prevent runaway jobs
- Every GitHub Action is pinned to a full commit SHA with a version comment
