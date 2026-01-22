# Convenience Scripts

This directory contains convenience scripts for common development operations.

All scripts pass through any additional arguments to the underlying docker-compose command. For example:

```bash
./s/up -d    # Start in detached mode
./s/logs api # Follow logs for the API service only
```

### `./s/up`

Starts all services, running in Docker Compose.  
Add the `--build` flag to rebuild images before starting.  
Usage: `./s/up` or `./s/up frontend` for specific service

### `./s/down`

Stops all services  
Usage: `./s/down`

### `./s/logs`

Follows logs from services  
Usage: `./s/logs` or `./s/logs api` for specific service

### `./s/restart`

Restarts services  
Usage: `./s/restart` or `./s/restart frontend` for specific service

### `./s/clean`

Cleans up all containers, volumes, and cached images  
Usage: `./s/clean`


