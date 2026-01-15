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
- **Black** - Python code formatter (100 char line length)
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
