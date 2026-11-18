#!/usr/bin/env bash
# Shared logging helpers for the scripts in s/.
#
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/utils/logging.sh" "<script-name>"
#
# Provides log(), to standard output, and error(), to standard error, each
# with the calling script's name in front. An error is red only when standard
# error is a terminal and NO_COLOR is not set, so CI logs and tests get plain
# text. It is only ever sourced, so it has no main().
#
# Always pass the name. Sourced without one, the file sees the calling
# script's own arguments, so its first argument would become the name.

_LOG_NAME="${1:-script}"

# Print a message for the person running the script.
log() {
	local message="$*"

	echo "[${_LOG_NAME}] ${message}"
}

# Print an error to standard error, in red on a terminal.
error() {
	local message="$*"
	local red=""
	local reset=""

	if [ -t 2 ] && [ -z "${NO_COLOR:-}" ]; then
		red=$'\033[0;31m'
		reset=$'\033[0m'
	fi

	echo "${red}[${_LOG_NAME}] ERROR: ${message}${reset}" >&2
}
