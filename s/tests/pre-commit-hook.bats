#!/usr/bin/env bats
# Tests for .githooks/pre-commit, the hook git runs before each commit. Each
# test runs a copy of the hook in a scratch git repository, with stand-ins for
# pre-commit and lint-staged, so no real check runs. Run with: bats s/tests

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

# A stand-in for s/checks/check-dev-details that logs its call and prints
# the warning, as it does while this machine's denylist is empty.
write_dev_details_stand_in() {
	mkdir -p "${repo}/s/checks"
	cat >"${repo}/s/checks/check-dev-details" <<'EOF'
#!/usr/bin/env bash
echo "dev-details: $*" >>"${BATS_TEST_TMPDIR}/calls.log"
echo "Strongly recommended: fill the denylist" >&2
EOF
	chmod +x "${repo}/s/checks/check-dev-details"
}

@test "recommends filling the dev-details denylist after the checks pass" {
	write_dev_details_stand_in
	stage file.txt

	run "${hook}"

	[ "$status" -eq 0 ]
	[ "$(sed -n 2p "${calls}")" = "dev-details: --warn-if-empty" ]
	[[ "$output" == *"Strongly recommended"* ]]
}

@test "git still commits while the dev-details denylist is empty" {
	write_dev_details_stand_in
	stage file.txt

	run git -C "${repo}" commit -q -m "add file"

	[ "$status" -eq 0 ]
	[[ "$output" == *"Strongly recommended"* ]]
	git -C "${repo}" rev-parse --verify -q HEAD
}

@test "gives no recommendation when a check stops the commit" {
	export PRE_COMMIT_STATUS=1
	write_dev_details_stand_in
	stage file.txt

	run "${hook}"

	[ "$status" -eq 1 ]
	run ! grep -q "dev-details" "${calls}"
}
