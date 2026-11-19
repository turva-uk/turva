#!/usr/bin/env bats
# Tests for s/floors/test-counts, which reads how many tests each suite
# collects, and s/floors/tests, which holds those counts to their floors.
# Each test runs copies of the scripts with stand-ins for pytest's Python,
# docker and npx, so no real suite runs. Run with: bats s/tests

# bats runs each test in its own process on purpose, so a report a test
# exports is meant to stay in that test. ShellCheck reads that as a change
# lost to a subshell, so SC2030 and SC2031 are off for this file.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	calls="${BATS_TEST_TMPDIR}/calls.log"

	mkdir -p "${repo}/s/floors" "${repo}/frontend" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../floors/test-counts" "${BATS_TEST_DIRNAME}/../floors/tests" "${BATS_TEST_DIRNAME}/../floors/check" "${BATS_TEST_DIRNAME}/../floors/update" "${repo}/s/floors/"

	cat >"${repo}/s/floors/minimums" <<'EOF'
safety-file-tests 144  # 90% of 161
django-tests 439  # 90% of 488
vitest-tests 3  # 90% of 4
EOF

	# The host's python3 stands in for pytest when its first argument is
	# -m, and is the real one otherwise, which counts Vitest's list.
	real_python="$(command -v python3)"
	cat >"${bin}/python3" <<EOF
#!/usr/bin/env bash
if [ "\$1" = "-m" ]; then
	echo "python3 \$*" >>"${calls}"
	printf '%s\n' "\${SAFETY_FILE_REPORT}"
	exit "\${SAFETY_FILE_STATUS:-0}"
fi
exec "${real_python}" "\$@"
EOF

	cat >"${bin}/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >>"${BATS_TEST_TMPDIR}/calls.log"
printf '%s\n' "${DJANGO_REPORT}"
EOF

	cat >"${bin}/npx" <<'EOF'
#!/usr/bin/env bash
echo "npx $* in ${PWD}" >>"${BATS_TEST_TMPDIR}/calls.log"
printf '%s\n' "${VITEST_LIST}"
EOF

	chmod +x "${bin}/python3" "${bin}/docker" "${bin}/npx"
	export PATH="${bin}:${PATH}"
	export SAFETY_FILE_REPORT="161 tests collected in 0.03s"
	export DJANGO_REPORT="488 tests collected in 0.68s"
	export VITEST_LIST='[{"name": "a"}, {"name": "b"}, {"name": "c"}, {"name": "d"}]'

	touch "${calls}"
}

@test "prints each suite's collected count" {
	run bash "${repo}/s/floors/test-counts" safety-file django vitest

	[ "$status" -eq 0 ]
	[ "$output" = "safety-file-tests 161
django-tests 488
vitest-tests 4" ]
}

@test "collects each suite without running it, where it runs" {
	run bash "${repo}/s/floors/test-counts" safety-file django vitest

	[ "$status" -eq 0 ]
	grep -qx "python3 -m pytest safety_file --collect-only -q" "${calls}"
	grep -qx "docker compose exec -T web pytest app --collect-only -q" "${calls}"
	grep -qx "npx vitest list --json in ${repo}/frontend" "${calls}"
}

@test "reads a count of one test" {
	export SAFETY_FILE_REPORT="1 test collected in 0.01s"

	run bash "${repo}/s/floors/test-counts" safety-file

	[ "$status" -eq 0 ]
	[ "$output" = "safety-file-tests 1" ]
}

@test "fails when a suite cannot be collected" {
	export SAFETY_FILE_REPORT="ERROR collecting safety_file/tests/test_team.py"
	export SAFETY_FILE_STATUS=2

	run bash "${repo}/s/floors/test-counts" safety-file

	[ "$status" -eq 1 ]
	[[ "$output" == *"The safety-file suite did not say how many tests it collected"* ]]
}

@test "fails for a suite it does not know" {
	run bash "${repo}/s/floors/test-counts" jest

	[ "$status" -eq 1 ]
	[[ "$output" == *"Unknown suite 'jest'"* ]]
}

@test "fails without a suite" {
	run bash "${repo}/s/floors/test-counts"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No suite given"* ]]
}

@test "tests passes when every suite is at or above its floor" {
	run bash "${repo}/s/floors/tests" safety-file django vitest

	[ "$status" -eq 0 ]
	[[ "$output" == *"django-tests: 488, floor 439"* ]]
}

@test "tests fails when a suite collects fewer than its floor" {
	export DJANGO_REPORT="300 tests collected in 0.5s"

	run bash "${repo}/s/floors/tests" django

	[ "$status" -eq 1 ]
	[[ "$output" == *"300 is below its floor of 439"* ]]
}

@test "tests --raise raises a floor the suite has outgrown" {
	export DJANGO_REPORT="700 tests collected in 0.9s"

	run bash "${repo}/s/floors/tests" --raise django

	[ "$status" -eq 0 ]
	[[ "$output" == *"floor raised from 439 to 630"* ]]
	grep -qE '^django-tests 630  # 90% of 700' "${repo}/s/floors/minimums"
}

@test "tests without --raise leaves a floor the suite has outgrown" {
	export DJANGO_REPORT="700 tests collected in 0.9s"

	run bash "${repo}/s/floors/tests" django

	[ "$status" -eq 0 ]
	grep -qx 'django-tests 439  # 90% of 488' "${repo}/s/floors/minimums"
}

@test "tests fails when a suite gives no count" {
	export VITEST_LIST="not json"

	run bash "${repo}/s/floors/tests" vitest

	[ "$status" -eq 1 ]
}

@test "tests fails without a suite" {
	run bash "${repo}/s/floors/tests" --raise

	[ "$status" -eq 1 ]
	[[ "$output" == *"No suite given"* ]]
}
