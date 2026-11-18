#!/usr/bin/env bats
# Tests for the `setup` recipe in the justfile. Each test runs a copy of the
# justfile in a scratch git repository, so the real clone's git config and
# frontend/node_modules are never touched. Run with: bats s/tests

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"

	mkdir -p "${repo}/frontend"
	cp "${BATS_TEST_DIRNAME}/../../justfile" "${repo}/justfile"
	git -C "${repo}" init -q
}

@test "setup points git at the tracked hooks" {
	run just --justfile "${repo}/justfile" --working-directory "${repo}" setup

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --get core.hooksPath)" = ".githooks" ]
}

@test "setup creates frontend/node_modules before Docker can" {
	run just --justfile "${repo}/justfile" --working-directory "${repo}" setup

	[ "$status" -eq 0 ]
	[ -d "${repo}/frontend/node_modules" ]
	[ -w "${repo}/frontend/node_modules" ]
}

@test "setup keeps a frontend/node_modules that already holds packages" {
	mkdir -p "${repo}/frontend/node_modules/lint-staged"

	run just --justfile "${repo}/justfile" --working-directory "${repo}" setup

	[ "$status" -eq 0 ]
	[ -d "${repo}/frontend/node_modules/lint-staged" ]
}

@test "setup gives the chown fix when frontend/node_modules is not writable" {
	mkdir -p "${repo}/frontend/node_modules"
	chmod 555 "${repo}/frontend/node_modules"

	run just --justfile "${repo}/justfile" --working-directory "${repo}" setup

	chmod 755 "${repo}/frontend/node_modules"
	[ "$status" -eq 1 ]
	[[ "$output" == *"frontend/node_modules is not writable"* ]]
	[[ "$output" == *'sudo chown "$USER:$USER" frontend/node_modules'* ]]
}
