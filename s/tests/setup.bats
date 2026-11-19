#!/usr/bin/env bats
# Test the canonical setup behind the optional Just alias with copied scripts.
# The real clone's Git config and frontend/node_modules are never touched.
# Bats needs no optional task runner to exercise setup. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"

	mkdir -p "${repo}/frontend" "${repo}/s/utils" "${repo}/.githooks"
	cp "${BATS_TEST_DIRNAME}/../../justfile" "${repo}/justfile"
	cp "${BATS_TEST_DIRNAME}/../install-hooks" "${repo}/s/install-hooks"
	cp "${BATS_TEST_DIRNAME}/../utils/frontend-directory.sh" "${repo}/s/utils/frontend-directory.sh"
	cp "${BATS_TEST_DIRNAME}/../../.githooks/pre-commit" "${repo}/.githooks/pre-commit"
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	git -C "${repo}" init -q
}

@test "setup points git at the tracked hooks" {
	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --get core.hooksPath)" = ".githooks" ]
}

@test "setup creates frontend/node_modules before Docker can" {
	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ -d "${repo}/frontend/node_modules" ]
	[ -w "${repo}/frontend/node_modules" ]
}

@test "setup keeps a frontend/node_modules that already holds packages" {
	mkdir -p "${repo}/frontend/node_modules/lint-staged"

	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ -d "${repo}/frontend/node_modules/lint-staged" ]
}

@test "setup gives the chown fix when frontend/node_modules is not writable" {
	mkdir -p "${repo}/frontend/node_modules"
	chmod 555 "${repo}/frontend/node_modules"

	run "${repo}/s/install-hooks"

	chmod 755 "${repo}/frontend/node_modules"
	[ "$status" -eq 1 ]
	[[ "$output" == *"frontend/node_modules is not writable"* ]]
	[[ "$output" == *"sudo chown \"\$(id -u):\$(id -g)\" frontend/node_modules"* ]]
	run git -C "${repo}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}

@test "the optional setup recipe remains a thin alias to the installer" {
	local body
	body=$(awk '/^setup:$/ { found = 1; next } found && /^$/ { exit } found { print }' "${repo}/justfile")
	[ "${body}" = '    @./s/install-hooks' ]
}
