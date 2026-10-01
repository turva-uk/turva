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
   - Start FastAPI backend (port 8000), which serves both the HTML interface and the JSON API
   - Start Caddy reverse proxy (port 80/443)

2. **Access the application:**
   - Application: <http://localhost>
   - API: <http://localhost/api/>
   - Direct API: <http://localhost:8000>

3. **View logs:**

   ```bash
   docker compose logs -f        # All services
   docker compose logs -f api    # API only
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

The API requires a `.env` file at `api/.env`. A template is provided:

```bash
cp api/.env.example api/.env  # If .env.example exists
# or manually create api/.env with required variables
```

### Running Migrations

Migrations are **not** applied automatically. Run them after first starting the stack, and after pulling changes that add a migration:

```bash
docker compose exec -w /app/src api alembic upgrade head
```

Without this the application starts but every query fails with `relation "tbl_user" does not exist`.

## Development Tips

- **Hot Reload**: Uvicorn reloads on Python and template changes
- **Code Formatting**: `cd api/src && ruff format .`
- **Linting**: `cd api/src && ruff check .`
- **Pre-commit Hooks**: Install with `pre-commit install` to automatically check code quality before commits

## Troubleshooting

### Port Conflicts

If ports 80, 443, or 8000 are already in use, stop conflicting services or modify the ports in `docker-compose.yml`.

### Database Connection Issues

Ensure the `DB_HOST` in `api/.env` is set to `postgres` (the Docker service name), not `localhost`.

### Container Issues

Clean up and rebuild:

```bash
docker compose down -v
j sd b
```
