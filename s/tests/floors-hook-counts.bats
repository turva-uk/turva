#!/usr/bin/env bats
# Tests for s/floors/hook-counts, which reads how much each counting
# pre-commit hook says it checked. Each test runs a copy of the script with a
# stand-in for pre-commit that prints a saved report for each hook, so no
# real hook runs. Run with: bats s/tests

# Bats intentionally isolates each test's exported failing-hook response.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	reports="${BATS_TEST_TMPDIR}/reports"

	mkdir -p "${repo}/s/floors" "${repo}/s/utils" "${bin}" "${reports}"
	cp "${BATS_TEST_DIRNAME}/../floors/hook-counts" "${repo}/s/floors/hook-counts"
	cp "${BATS_TEST_DIRNAME}/../utils/hook-counts.py" "${repo}/s/utils/hook-counts.py"

	# pre-commit prints the saved report for the hook it is asked to run,
	# and fails when that hook's report file is named in $FAILING_HOOK.
	cat >"${bin}/pre-commit" <<'EOF'
#!/usr/bin/env bash
hook_id="$2"
cat "${BATS_TEST_TMPDIR}/reports/${hook_id}"
[ "${hook_id}" != "${FAILING_HOOK:-}" ]
EOF

	chmod +x "${bin}/pre-commit"
	export PATH="${bin}:${PATH}"

	# Reports as each hook prints them with --verbose. bandit and cspell
	# come in two batches, as pre-commit splits a long file list.
	cat >"${reports}/bandit" <<'EOF'
bandit...................................................................Passed
	Total lines of code: 4000
Files skipped (0):
	Total lines of code: 2219
Files skipped (0):
EOF

	cat >"${reports}/mypy" <<'EOF'
Success: no issues found in 21 source files
EOF

	cat >"${reports}/cspell" <<'EOF'
CSpell: Files checked: 45, Issues found: 0 in 0 files.
CSpell: Files checked: 4, Issues found: 0 in 0 files.
EOF

	cat >"${reports}/zizmor" <<'EOF'
 INFO audit: zizmor: completed .github/dependabot.yml
 INFO audit: zizmor: completed .github/workflows/ci.yml
No findings to report. Good job!
EOF

	cat >"${reports}/check-dev-details" <<'EOF'
Checked 300 files for dev details
Checked 60 files for dev details
EOF
}

@test "prints each hook's count, adding up its batches" {
	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 0 ]
	[ "$output" = "bandit-lines 6219
mypy-files 21
cspell-files 49
zizmor-files 2
dev-details-files 360" ]
}

@test "reads mypy's count for a single file" {
	echo "Success: no issues found in 1 source file" >"${reports}/mypy"

	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 0 ]
	[[ "$output" == *"mypy-files 1"* ]]
}

@test "fails when Bandit skipped a file it could not read" {
	cat >"${reports}/bandit" <<'EOF'
	Total lines of code: 6000
Files skipped (1):
	app/new.py (syntax error while parsing AST from file)
EOF

	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"Bandit could not read 1 files"* ]]
}

@test "fails when a hook does not report a count" {
	echo "bandit.......................................(no files to check)Skipped" >"${reports}/bandit"

	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"The bandit hook did not say how much it checked"* ]]
}

@test "fails when Zizmor audited nothing" {
	echo "zizmor.......................................(no files to check)Skipped" >"${reports}/zizmor"

	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"The zizmor hook did not say how much it checked"* ]]
}

@test "fails when a hook fails its own check" {
	export FAILING_HOOK=mypy

	run bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"The mypy hook failed"* ]]
}

@test "fails when pre-commit is missing" {
	local bare="${BATS_TEST_TMPDIR}/bare"

	mkdir -p "${bare}"
	ln -s "$(command -v bash)" "${bare}/bash"
	ln -s "$(command -v dirname)" "${bare}/dirname"

	run env PATH="${bare}" bash "${repo}/s/floors/hook-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"pre-commit not found"* ]]
}

@test "a later hook failure emits no partial measurement stream" {
	export FAILING_HOOK=mypy
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "missing per-batch Bandit skip evidence is not silently treated as zero" {
	printf 'Total lines of code: 4000\nFiles skipped (0):\nTotal lines of code: 2219\n' >"${reports}/bandit"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "duplicate serial mypy summaries and malformed counts are refused" {
	printf 'Success: no issues found in 21 source files\nSuccess: no issues found in 21 source files\n' >"${reports}/mypy"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
	echo 'Success: no issues found in many source files' >"${reports}/mypy"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "a truncated Zizmor report and duplicate completion identities are refused" {
	printf ' INFO audit: zizmor: completed .github/workflows/ci.yml\n' >"${reports}/zizmor"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
	printf ' INFO audit: zizmor: completed .github/workflows/ci.yml\n INFO audit: zizmor: completed .github/workflows/ci.yml\nNo findings to report.\n' >"${reports}/zizmor"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "coloured Zizmor records are decoded but unrelated completed text is not counted" {
	printf '\033[32m INFO\033[0m audit: zizmor: completed .github/workflows/ci.yml\nNo findings to report.\n' >"${reports}/zizmor"
	run bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 0 ]
	[[ "$output" == *'zizmor-files 1'* ]]
	echo 'some unrelated completed operation' >>"${reports}/zizmor"
	run --separate-stderr bash "${repo}/s/floors/hook-counts"
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}
