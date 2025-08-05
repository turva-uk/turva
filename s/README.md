# Convenience Scripts

This directory contains convenience scripts for common development operations.

## Available Scripts

- `./s/up`: Start all services (with `--build` flag)
  - Usage: `./s/up` or `./s/up frontend` for specific service
- `./s/down`: Stop all services
  - Usage: `./s/down`
- `./s/logs`: Follow logs from services
  - Usage: `./s/logs` or `./s/logs api` for specific service
- `./s/restart`: Restart services
  - Usage: `./s/restart` or `./s/restart frontend` for specific service
- `./s/clean`: Clean up all containers, volumes, and cached images
  - Usage: `./s/clean`

## Usage

All scripts pass through any additional arguments to the underlying docker-compose command. For example:

```bash
./s/up -d    # Start in detached mode
./s/logs api # Follow logs for the API service only
```

## Requirements

- Docker
- Docker Compose V2
