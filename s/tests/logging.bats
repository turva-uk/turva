#!/usr/bin/env bats
# Tests for s/utils/logging.sh. Each test sources it in a fresh bash, so the
# name it is given never leaks between tests.

# The quoted scripts expand $1 inside the fresh child Bash, not inside Bats.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
	logging="${BATS_TEST_DIRNAME}/../utils/logging.sh"
}

@test "log prints to standard output with the script's name in front" {
	run --separate-stderr bash -c 'source "$1" deploy; log "Copying the notes"' _ "${logging}"

	[ "$status" -eq 0 ]
	[ "$output" = "[deploy] Copying the notes" ]
	[ -z "$stderr" ]
}

@test "error prints to standard error with ERROR after the name" {
	run --separate-stderr bash -c 'source "$1" deploy; error "No version given"' _ "${logging}"

	[ "$status" -eq 0 ]
	[ -z "$output" ]
	[ "$stderr" = "[deploy] ERROR: No version given" ]
}

@test "error has no colour codes when standard error is not a terminal" {
	run --separate-stderr bash -c 'source "$1" deploy; error "boom"' _ "${logging}"

	[[ "$stderr" != *$'\033'* ]]
}

@test "with no name and no arguments it says script" {
	run bash -c "source '${logging}'; log hello"

	[ "$output" = "[script] hello" ]
}
