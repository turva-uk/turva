#!/usr/bin/env bats
# Tests for s/floors/test-counts, which reads how many tests each suite
# collects, and s/floors/tests, which holds those counts to their floors.
# Each test runs copies of the scripts with stand-ins for pytest's Python,
# Docker, Node and Bats, so no real suite runs. Run with: bats s/tests

# bats runs each test in its own process on purpose, so a report a test
# exports is meant to stay in that test. ShellCheck reads that as a change
# lost to a subshell, so SC2030 and SC2031 are off for this file.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	calls="${BATS_TEST_TMPDIR}/calls.log"

	mkdir -p "${repo}/s/floors" "${repo}/s/utils" "${repo}/frontend/src" "${repo}/frontend/node_modules/vitest" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../floors/test-counts" "${BATS_TEST_DIRNAME}/../floors/tests" "${BATS_TEST_DIRNAME}/../floors/check" "${BATS_TEST_DIRNAME}/../floors/update" "${repo}/s/floors/"
	cp "${BATS_TEST_DIRNAME}/../utils/"{test-counts,floors}.py "${repo}/s/utils/"
	touch "${repo}/frontend/src/example.test.ts" "${repo}/frontend/node_modules/vitest/vitest.mjs"

	cat >"${repo}/s/floors/minimums" <<'EOF'
safety-file-tests 144  # 90% of 161
django-tests 439  # 90% of 488
vitest-tests 3  # 90% of 4
bats-tests 9  # 90% of 10
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
exit "${DJANGO_STATUS:-0}"
EOF

	cat >"${bin}/node" <<'EOF'
#!/usr/bin/env bash
echo "node $* in ${PWD}" >>"${BATS_TEST_TMPDIR}/calls.log"
printf '%s\n' "${VITEST_LIST}"
exit "${VITEST_STATUS:-0}"
EOF
	cat >"${bin}/bats" <<'EOF'
#!/usr/bin/env bash
echo "bats $*" >>"${BATS_TEST_TMPDIR}/calls.log"
printf '%s\n' "${BATS_REPORT}"
exit "${BATS_STATUS:-0}"
EOF

	chmod +x "${bin}/python3" "${bin}/docker" "${bin}/node" "${bin}/bats"
	export PATH="${bin}:${PATH}"
	export SAFETY_FILE_REPORT="161 tests collected in 0.03s"
	export DJANGO_REPORT="488 tests collected in 0.68s"
	export VITEST_LIST='[{"name":"a","file":"src/example.test.ts","projectName":"unit","location":{"line":1,"column":1}},{"name":"b","file":"src/example.test.ts","projectName":"unit","location":{"line":2,"column":1}},{"name":"c","file":"src/example.test.ts","projectName":"unit","location":{"line":3,"column":1}},{"name":"d","file":"src/example.test.ts","projectName":"unit","location":{"line":4,"column":1}}]'
	export BATS_REPORT=10

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
	grep -qx "python3 -m pytest safety_file --collect-only -q --color=no" "${calls}"
	grep -qx "docker compose exec -T web pytest app --collect-only -q --color=no" "${calls}"
	grep -qx "node node_modules/vitest/vitest.mjs list --project=unit --json in ${repo}/frontend" "${calls}"
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
	[[ "$output" == *"The safety-file suite did not produce a successful bounded collection report"* ]]
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

@test "duplicate pytest collection summaries fail without partial output" {
	export DJANGO_REPORT=$'488 tests collected in 0.1s\n1 test collected in 0.1s'
	run --separate-stderr bash "${repo}/s/floors/test-counts" safety-file django
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "non-array and duplicate Vitest reports are not collection evidence" {
	local report
	for report in '{"name":"not an array"}' '[{"name":"same"},{"name":"same"}]'; do
		export VITEST_LIST="${report}"
		run --separate-stderr bash "${repo}/s/floors/test-counts" vitest
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
}

@test "duplicate and unknown requested suites are rejected before collecting anything" {
	run --separate-stderr bash "${repo}/s/floors/test-counts" safety-file safety-file
	[ "$status" -eq 1 ]
	[ ! -s "${calls}" ]
	[ -z "${output}" ]
	run --separate-stderr bash "${repo}/s/floors/test-counts" safety-file unknown
	[ "$status" -eq 1 ]
	[ ! -s "${calls}" ]
	[ -z "${output}" ]
}

@test "Bats is counted on the host without running tests" {
	run bash "${repo}/s/floors/test-counts" bats
	[ "$status" -eq 0 ]
	[ "$output" = 'bats-tests 10' ]
	grep -qx 'bats --count s/tests' "${calls}"
}

@test "zero filtered malformed and ambiguous native reports cannot prove a full scope" {
	local report
	for report in '0 tests collected in 0.1s' '1/10 tests collected (9 deselected) in 0.1s' 'many tests collected in 0.1s' $'1 test collected in 0.1s\n2 tests collected in 0.1s'; do
		export SAFETY_FILE_REPORT="${report}"
		run --separate-stderr bash "${repo}/s/floors/test-counts" safety-file
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
	for report in 0 -1 true $'10\n11'; do
		export BATS_REPORT="${report}"
		run --separate-stderr bash "${repo}/s/floors/test-counts" bats
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
}

@test "Vitest requires unique unit file name and positive source-location identities" {
	local report
	for report in '[]' '[null]' '[{"name":"a"}]' '[{"name":"a","file":"src/example.test.ts","projectName":"storybook-light","location":{"line":1,"column":1}}]' '[{"name":"a","file":"src/example.test.ts","projectName":"unit","location":{"line":true,"column":1}}]' '[{"name":"a","file":"src/missing.test.ts","projectName":"unit","location":{"line":1,"column":1}}]' '[{"name":"a","file":"src/example.test.ts","projectName":"unit","projectName":"unit","location":{"line":1,"column":1}}]'; do
		export VITEST_LIST="${report}"
		run --separate-stderr bash "${repo}/s/floors/test-counts" vitest
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
	export VITEST_LIST='[{"name":"a","file":"src/example.test.ts","projectName":"unit","location":{"line":1,"column":1}},{"name":"a","file":"src/example.test.ts","projectName":"unit","location":{"line":1,"column":1}}]'
	run --separate-stderr bash "${repo}/s/floors/test-counts" vitest
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "a missing local Vitest module refuses without invoking a package installer" {
	rm "${repo}/frontend/node_modules/vitest/vitest.mjs"
	run bash "${repo}/s/floors/test-counts" vitest
	[ "$status" -eq 1 ]
	[[ "$output" == *'no packages were installed'* ]]
	[ ! -s "${calls}" ]
}

@test "a failed later suite cannot raise an earlier stale suite floor" {
	local minimums="${repo}/s/floors/minimums"
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	export SAFETY_FILE_REPORT='300 tests collected in 0.1s' DJANGO_STATUS=2
	run bash "${repo}/s/floors/tests" --raise safety-file django
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	[[ "$output" != *'floor raised'* ]]
}

@test "a successful but incomplete suite producer cannot mutate expected floors" {
	local minimums="${repo}/s/floors/minimums"
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	printf '#!/usr/bin/env bash\necho safety-file-tests 300\n' >"${repo}/s/floors/test-counts"
	run bash "${repo}/s/floors/tests" --raise safety-file django
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "scanner timeouts and oversized reports emit no count" {
	run python3 - "${repo}/s/utils/test-counts.py" <<'PY'
import importlib.util, subprocess, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('test_counts', sys.argv[1])
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
for mode in ('timeout', 'oversized'):
    def run(*args, **kwargs):
        assert kwargs['timeout'] == 180
        if mode == 'timeout':
            raise subprocess.TimeoutExpired('synthetic', 180)
        kwargs['stdout'].write(b'x' * (module.MAX_BYTES + 1))
        return subprocess.CompletedProcess(args[0], 0)
    with patch.object(module.subprocess, 'run', side_effect=run):
        module.sys.argv = [sys.argv[1], 'safety-file']
        assert module.main() == 1
PY
	[ "$status" -eq 0 ]
	[[ "$output" != *'safety-file-tests '* ]]
}

@test "a failing native tool cannot be masked by a valid-looking report" {
	export BATS_STATUS=1
	run --separate-stderr bash "${repo}/s/floors/test-counts" bats
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
	export VITEST_STATUS=1
	run --separate-stderr bash "${repo}/s/floors/test-counts" vitest
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}
