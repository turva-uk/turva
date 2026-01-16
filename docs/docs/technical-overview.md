# Technical Overview

Turva is a monorepo application built with modern web technologies, containerized for consistent development and deployment.

## Architecture

### Frontend

React 19 with TypeScript and Vite for fast development and hot module replacement. Mantine UI provides the component library for a consistent user experience.

### API

FastAPI backend with async PostgreSQL database using Ormar ORM. Alembic handles database migrations with full version control.

### Reverse Proxy

Caddy serves as the reverse proxy, routing `/api/*` requests to the FastAPI backend and all other requests to the React frontend. Configured via `Caddyfile` for simple local development.

### Authentication

Session-based authentication with Argon2 password hashing. Custom middleware validates sessions on every request, with sessions stored in PostgreSQL.

### Containerization

Docker Compose orchestrates three services: `frontend`, `api`, and Caddy reverse proxy. Scripts in `s/` directory provide convenient commands (`up`, `down`, `logs`, `restart`, `clean`).

## Development Tools

### Code Quality

- **Prettier** - Automatic formatting on save for markdown, JSON, and YAML
- **Ruff** - Fast Python linter and formatter (replaces Black, Flake8, isort)
- **ESLint** - JavaScript/TypeScript linting
- **Markdownlint** - Markdown style checking
- **Code Spell Checker** - Spell checking with custom dictionary (`cspell.config.json`)
- **Pre-commit** - Git hooks enforce spelling, formatting, and linting before commits

### Testing

- **Backend**: pytest with async support, coverage reporting
- **Frontend**: Vitest with React Testing Library
- **Storybook**: Component development and documentation

### Database

PostgreSQL in production, SQLite for testing. Complete test isolation with fresh database per test via pytest fixtures.

## CI/CD Pipeline

### Non-main Branch Workflow

Automated quality checks run on every push to feature branches and pull requests:

#### Python Checks

- **Styling**: Pre-commit hooks enforce code formatting (Ruff), markdown linting, spell checking, and YAML validation
- **Unit Tests**: pytest suite runs in Docker containers with isolated test databases
- Caching for virtual environments, pip packages, and pre-commit hooks speeds up subsequent runs

#### TypeScript Checks

Parallel execution of multiple quality checks via matrix strategy:

- **lint**: ESLint rules for TypeScript and React
- **prettier**: Code formatting verification
- **stylelint**: CSS/styling validation
- **typecheck**: TypeScript compiler checks
- **test:ci**: Vitest test suite in CI mode

Yarn dependencies cached with Corepack-managed Yarn 4.10.3.

#### Security Scanning

- **Semgrep**: Static analysis security testing (SAST) for frontend JavaScript/TypeScript
- Runs with custom ruleset (`.semgrep.yml`)
- Fails build on security findings

### Optimizations

- Concurrency groups cancel in-progress runs when new commits are pushed to the same branch
- Aggressive caching for dependencies, pre-commit hooks, and build artifacts
- Fail-fast disabled for matrix jobs to see all failures
- 15-20 minute timeouts prevent runaway jobs
