# Convenience Scripts

Each script wraps one repeated process. All of them forward extra arguments to the underlying tool, so:

```bash
./s/up -d        # Start in detached mode
./s/logs api     # Follow logs for the API service only
./s/test -k login  # Run only tests matching "login"
```

## Running the stack

### `./s/up`

Starts all services in Docker Compose.
Add `--build` to rebuild images before starting, or `-d` to run detached.
Usage: `./s/up` or `./s/up api` for a specific service.

### `./s/down`

Stops all services.

### `./s/restart`

Restarts services.
Usage: `./s/restart` or `./s/restart api` for a specific service.

### `./s/logs`

Follows logs from services.
Usage: `./s/logs` or `./s/logs api` for a specific service.

### `./s/clean`

Removes all containers, volumes, and cached images. Destroys local database contents.

## Development

### `./s/test`

Runs the Python test suite inside the api container. Requires the stack to be running.
Usage: `./s/test`, or `./s/test /app/src/tests/unit` for a subset.

### `./s/lint`

Runs every check CI enforces: `pre-commit run --all-files`, then the Zizmor GitHub Actions audit. Run this before committing.

### `./s/lock`

Regenerates the pinned dependency locks from the `.in` declarations, for both `api/` and `docs/`. Run after editing any `requirements*.in`, and commit the `.in` and `.txt` changes together.

### `./s/docs`

Serves the documentation site with hot reload at <http://localhost:8001>.
