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
   - Start FastAPI backend (port 8000)
   - Start React frontend (port 5173)
   - Start Caddy reverse proxy (port 80/443)

2. **Access the application:**
   - Frontend: <http://localhost>
   - API: <http://localhost/api/>
   - Direct frontend: <http://localhost:5173>
   - Direct API: <http://localhost:8000>

3. **View logs:**

   ```bash
   docker compose logs -f        # All services
   docker compose logs -f api    # API only
   docker compose logs -f frontend # Frontend only
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

Database migrations are automatically applied on startup. To manually run migrations:

```bash
docker compose exec api alembic upgrade head
```

## Development Tips

- **Hot Reload**: Both frontend (Vite) and backend (Uvicorn) support hot reloading
- **Code Formatting**:
  - Python: `cd api/src && ruff format .`
  - TypeScript: `cd frontend && yarn format`
- **Linting**:
  - Python: `cd api/src && ruff check .`
  - TypeScript: `cd frontend && yarn lint`
- **Pre-commit Hooks**: Install with `pre-commit install` to automatically check code quality before commits

## Troubleshooting

### Port Conflicts

If ports 80, 443, 5173, or 8000 are already in use, stop conflicting services or modify the ports in `docker-compose.yml`.

### Database Connection Issues

Ensure the `DB_HOST` in `api/.env` is set to `postgres` (the Docker service name), not `localhost`.

### Container Issues

Clean up and rebuild:

```bash
docker compose down -v
j sd b
```
