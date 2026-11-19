#!/usr/bin/env bats
# Tests for .githooks/pre-commit, the hook git runs before each commit. Each
# test runs a copy of the hook in a scratch git repository, with stand-ins for
# pre-commit and lint-staged, so no real check runs. Run with: bats s/tests

# Each Bats test intentionally has its own process and exported fixture values.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	hook="${repo}/.githooks/pre-commit"
	calls="${BATS_TEST_TMPDIR}/calls.log"

	mkdir -p "${repo}/.githooks" "${repo}/frontend/node_modules/.bin" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../../.githooks/pre-commit" "${hook}"

	# A scratch repository with the hook switched on, as `just setup` does.
	git -C "${repo}" init -q
	git -C "${repo}" config user.name "Test"
	git -C "${repo}" config user.email "test@example.com"
	git -C "${repo}" config commit.gpgsign false
	git -C "${repo}" config core.hooksPath .githooks

	# pre-commit records each call, and exits with $PRE_COMMIT_STATUS.
	write_stand_in "${bin}/pre-commit" "path" "PRE_COMMIT_STATUS"
	export PATH="${bin}:${PATH}"
	export PRE_COMMIT_STATUS=0

	# lint-staged records the folder it ran in, and exits with
	# $LINT_STAGED_STATUS.
	write_stand_in "${repo}/frontend/node_modules/.bin/lint-staged" "lint-staged" "LINT_STAGED_STATUS"
	export LINT_STAGED_STATUS=0

	touch "${calls}"
}

# Write a stand-in that logs its label, its arguments and the folder it ran
# in, then exits with the status held in the named variable.
write_stand_in() {
	local path="$1"
	local label="$2"
	local status_variable="$3"

	cat >"${path}" <<EOF
#!/usr/bin/env bash
echo "${label}: \$* in \${PWD}" >>"\${BATS_TEST_TMPDIR}/calls.log"
echo "\${PWD}" >>"\${BATS_TEST_TMPDIR}/pre-commit-cwd.log"
exit "\${${status_variable}}"
EOF

	chmod +x "${path}"
}

# Stage one new file at the given path inside the scratch repository.
stage() {
	local path="$1"

	mkdir -p "$(dirname "${repo}/${path}")"
	echo "content" >"${repo}/${path}"
	git -C "${repo}" add "${path}"
}

@test "runs pre-commit on the staged files" {
	stage file.txt

	run "${hook}"

	[ "$status" -eq 0 ]
	[[ "$(cat "${calls}")" == "path: run in "* ]]
}

@test "fails when a pre-commit check fails" {
	export PRE_COMMIT_STATUS=1
	stage file.txt

	run "${hook}"

	[ "$status" -eq 1 ]
}

@test "prefers the repository's .venv copy of pre-commit" {
	mkdir -p "${repo}/.venv/bin"
	write_stand_in "${repo}/.venv/bin/pre-commit" "venv" "PRE_COMMIT_STATUS"
	stage file.txt

	run "${hook}"

	[ "$status" -eq 0 ]
	[[ "$(cat "${calls}")" == "venv: run in "* ]]
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

@test "runs lint-staged in frontend/ when a frontend file is staged" {
	stage frontend/src/App.tsx

	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(sed -n 2p "${calls}")" = "lint-staged:  in ${repo}/frontend" ]
}

@test "skips lint-staged when no frontend file is staged" {
	stage app/models.py

	run "${hook}"

	[ "$status" -eq 0 ]
	run ! grep -q "lint-staged" "${calls}"
}

@test "skips lint-staged when a pre-commit check fails" {
	export PRE_COMMIT_STATUS=1
	stage frontend/src/App.tsx

	run "${hook}"

	[ "$status" -eq 1 ]
	run ! grep -q "lint-staged" "${calls}"
}

@test "fails when a lint-staged check fails" {
	export LINT_STAGED_STATUS=1
	stage frontend/src/App.tsx

	run "${hook}"

	[ "$status" -eq 1 ]
}

@test "stops with an install hint when the frontend's packages are missing" {
	rm "${repo}/frontend/node_modules/.bin/lint-staged"
	stage frontend/src/App.tsx

	run "${hook}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"lint-staged not found, so the commit was stopped"* ]]
	[[ "$output" == *"./s/frontend install"* ]]
}

@test "git commits when the hook passes" {
	stage frontend/src/App.tsx

	run git -C "${repo}" commit -q -m "add file"

	[ "$status" -eq 0 ]
	[ "$(wc -l <"${calls}")" -eq 2 ]
	git -C "${repo}" rev-parse --verify -q HEAD
}

@test "git refuses the commit when pre-commit fails" {
	export PRE_COMMIT_STATUS=1
	stage file.txt

	run ! git -C "${repo}" commit -q -m "add file"

	[[ "$(cat "${calls}")" == "path: run in "* ]]
	run ! git -C "${repo}" rev-parse --verify -q HEAD
}

@test "git refuses the commit when lint-staged fails" {
	export LINT_STAGED_STATUS=1
	stage frontend/src/App.tsx

	run ! git -C "${repo}" commit -q -m "add file"

	run ! git -C "${repo}" rev-parse --verify -q HEAD
}

@test "direct invocation checks its own checkout rather than the calling folder" {
	local elsewhere="${BATS_TEST_TMPDIR}/elsewhere"
	mkdir -p "${elsewhere}"
	cd "${elsewhere}" || return 1

	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/pre-commit-cwd.log")" = "${repo}" ]
}

@test "scratch commits do not inherit the developer's signing setup" {
	local global_config="${BATS_TEST_TMPDIR}/global.gitconfig"
	git config --file "${global_config}" commit.gpgsign true
	git config --file "${global_config}" gpg.format ssh
	git config --file "${global_config}" user.signingKey "${BATS_TEST_TMPDIR}/missing-test-key"
	export GIT_CONFIG_GLOBAL="${global_config}" GIT_CONFIG_NOSYSTEM=1
	git -C "${repo}" config --local commit.gpgsign false
	stage file.txt

	run git -C "${repo}" commit -q -m "add file"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --local --get commit.gpgsign)" = "false" ]
	git -C "${repo}" rev-parse --verify -q HEAD
}

@test "a failed staged-file query stops rather than skipping frontend checks" {
	stage frontend/src/App.tsx
	printf '#!/usr/bin/env bash\nexit 128\n' >"${bin}/git"
	chmod +x "${bin}/git"

	run "${hook}"

	[ "$status" -eq 128 ]
	[[ "$output" == *"Could not inspect staged frontend files"* ]]
}

@test "deleting the only frontend file needs no lint-staged executable" {
	stage frontend/src/App.tsx
	git -C "${repo}" commit -qm baseline
	git -C "${repo}" rm -q frontend/src/App.tsx
	rm "${repo}/frontend/node_modules/.bin/lint-staged"

	run "${hook}"

	[ "$status" -eq 0 ]
}

# A stand-in that would fail if the hook tried to run personal setup itself.
write_dev_details_stand_in() {
	mkdir -p "${repo}/s/checks"
	cat >"${repo}/s/checks/check-dev-details" <<'EOF'
#!/usr/bin/env bash
echo "dev-details: $*" >>"${BATS_TEST_TMPDIR}/calls.log"
exit 99
EOF
	chmod +x "${repo}/s/checks/check-dev-details"
}

@test "passing checks do not prompt for personal setup" {
	write_dev_details_stand_in
	stage file.txt

	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(wc -l <"${calls}")" -eq 1 ]
	[ -z "${output}" ]
}

@test "git still commits without optional personal setup" {
	write_dev_details_stand_in
	stage file.txt

	run git -C "${repo}" commit -q -m "add file"

	[ "$status" -eq 0 ]
	[ -z "${output}" ]
	git -C "${repo}" rev-parse --verify -q HEAD
}

@test "a failed check does not run separate personal setup" {
	export PRE_COMMIT_STATUS=1
	write_dev_details_stand_in
	stage file.txt

	run "${hook}"

	[ "$status" -eq 1 ]
	run ! grep -q "dev-details" "${calls}"
}
