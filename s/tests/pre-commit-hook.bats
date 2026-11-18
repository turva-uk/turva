#!/usr/bin/env bats
# Tests for .githooks/pre-commit, the hook git runs before each commit. Each
# test runs a copy of the hook in a scratch repository, with a stand-in for
# pre-commit, so no real check runs. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	hook="${repo}/.githooks/pre-commit"

	mkdir -p "${repo}/.githooks" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../../.githooks/pre-commit" "${hook}"

	# pre-commit records each call, and exits with $PRE_COMMIT_STATUS.
	write_pre_commit "${bin}/pre-commit" "path"
	export PATH="${bin}:${PATH}"
	export PRE_COMMIT_STATUS=0

	touch "${BATS_TEST_TMPDIR}/pre-commit.log"
}

# Write a stand-in pre-commit that logs its arguments under a label, so a
# test can tell which copy ran.
write_pre_commit() {
	local path="$1"
	local label="$2"

	cat >"${path}" <<EOF
#!/usr/bin/env bash
echo "${label}: \$*" >>"\${BATS_TEST_TMPDIR}/pre-commit.log"
exit "\${PRE_COMMIT_STATUS}"
EOF

	chmod +x "${path}"
}

# A scratch git repository with the hook switched on, as `just setup` does.
init_git_repo() {
	git -C "${repo}" init -q
	git -C "${repo}" config user.name "Test"
	git -C "${repo}" config user.email "test@example.com"
	git -C "${repo}" config core.hooksPath .githooks

	echo "content" >"${repo}/file.txt"
	git -C "${repo}" add file.txt
}

@test "runs pre-commit on the staged files" {
	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/pre-commit.log")" = "path: run" ]
}

@test "fails when a pre-commit check fails" {
	export PRE_COMMIT_STATUS=1

	run "${hook}"

	[ "$status" -eq 1 ]
}

@test "prefers the repository's .venv copy of pre-commit" {
	mkdir -p "${repo}/.venv/bin"
	write_pre_commit "${repo}/.venv/bin/pre-commit" "venv"

	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/pre-commit.log")" = "venv: run" ]
}

@test "stops with an install hint when pre-commit is missing" {
	local bare="${BATS_TEST_TMPDIR}/bare"

	mkdir -p "${bare}"
	ln -s "$(command -v bash)" "${bare}/bash"
	ln -s "$(command -v dirname)" "${bare}/dirname"

	run env PATH="${bare}" "${hook}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"pre-commit not found, so the commit was stopped"* ]]
	[[ "$output" == *".venv/bin/pip install pre-commit"* ]]
}

@test "git commits when the hook passes" {
	init_git_repo

	run git -C "${repo}" commit -q -m "add file"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/pre-commit.log")" = "path: run" ]
	git -C "${repo}" rev-parse --verify -q HEAD
}

@test "git refuses the commit when the hook fails" {
	export PRE_COMMIT_STATUS=1
	init_git_repo

	run ! git -C "${repo}" commit -q -m "add file"

	[ "$(cat "${BATS_TEST_TMPDIR}/pre-commit.log")" = "path: run" ]
	run ! git -C "${repo}" rev-parse --verify -q HEAD
}
