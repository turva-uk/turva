# Getting Started

## Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [just](https://github.com/casey/just) command runner

## Quick Start

Turva uses [just](https://github.com/casey/just) as a command runner for common development tasks.

**Install just:**

```bash
# macOS
brew install just

# Linux
cargo install just

# Other platforms: https://github.com/casey/just#installation
```

**Set up the `j` alias** (optional but convenient):

```bash
just abbreviate-just
# or: j aj
source ~/.zshrc
```

**Available commands:**

```bash
just              # List all available commands
j sd              # Start development environment
j sd b            # Start development environment (with rebuild)
j sc              # Stop all containers
```

## Development Workflow

1. **Start the services:**

   ```bash
   j sd
   ```

   This will:
   - Build Docker images (if needed)
   - Start PostgreSQL database
   - Start the Django application (port 8000), which serves the pages and performs Git operations on safety files
   - Start Caddy reverse proxy (port 80/443)

2. **Access the application:**
   - Application: <http://localhost>
   - Direct, bypassing Caddy: <http://localhost:8000>
   - Admin: <http://localhost/admin/> (create an account with `./s/manage createsuperuser`)

3. **View logs:**

   ```bash
   docker compose logs -f        # All services
   docker compose logs -f web    # application only
   ```

4. **Stop the services:**

   ```bash
   j sc
   ```

## First-Time Setup

### Database Initialization

On first run, the PostgreSQL database will be automatically initialized. If you need to reset the database:

```bash
docker compose down -v    # Remove volumes
j sd                       # Start fresh
```

### Environment Variables

The application requires a `.env` file at `app/.env`. A template is provided:

```bash
cp app/.env.example app/.env
```

`SECRET_KEY` and the database settings have no defaults: a misconfigured deployment fails at startup rather than running with a predictable signing key.

### Running Migrations

Migrations are **not** applied automatically. Run them after first starting the stack, and after pulling changes that add a migration:

```bash
./s/manage migrate
```

Without this the application starts but every query fails with `relation "tbl_user" does not exist`.

## Development Tips

- **Hot Reload**: the Django development server reloads on Python and template changes
- **Code Formatting**: `ruff format .`
- **Linting**: `ruff check .`, or `./s/lint` for everything CI enforces
- **Pre-commit Hooks**: Install with `pre-commit install` to automatically check code quality before commits

## Troubleshooting

### Port Conflicts

If ports 80, 443, or 8000 are already in use, stop conflicting services or modify the ports in `docker-compose.yml`.

### Database Connection Issues

Ensure the `DB_HOST` in `app/.env` is set to `postgres` (the Docker service name), not `localhost`.

### Container Issues

Clean up and rebuild:

```bash
docker compose down -v
j sd b
```
