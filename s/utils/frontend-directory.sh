#!/usr/bin/env bash
# Source from the repository root before Docker or host npm uses this path.
# Creating it as the caller avoids Docker creating a root-owned mount point.

prepare_frontend_directory() {
	if ! mkdir -p frontend/node_modules; then
		echo "Could not prepare frontend/node_modules; inspect its ownership and parent directory." >&2
		return 1
	fi
	if [ ! -w frontend/node_modules ]; then
		echo "frontend/node_modules is not writable. Inspect its ownership; if Docker created it as root, fix it once with:" >&2
		echo "  sudo chown \"\$(id -u):\$(id -g)\" frontend/node_modules" >&2
		return 1
	fi
}
