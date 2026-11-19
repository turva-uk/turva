#!/usr/bin/env bats
# Tests for s/floors/check and s/floors/update, which hold each check's
# count against its floor in s/floors/minimums. Each test runs copies of the
# scripts beside a made-up minimums file. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	minimums="${repo}/s/floors/minimums"

	mkdir -p "${repo}/s/floors"
	cp "${BATS_TEST_DIRNAME}/../floors/check" "${BATS_TEST_DIRNAME}/../floors/update" "${repo}/s/floors/"

	cat >"${minimums}" <<'EOF'
# Floors under the checks.
bandit-lines 900  # 90% of 1000, measured 2026-11-19
mypy-files 18  # 90% of 21, measured 2026-11-19
EOF
}

# Run s/floors/check with the given counts on standard input.
check() {
	local counts="$1"

	run bash -c "printf '%b' '${counts}' | bash '${repo}/s/floors/check'"
}

# Run s/floors/check --raise with the given counts on standard input.
check_raising() {
	local counts="$1"

	run bash -c "printf '%b' '${counts}' | bash '${repo}/s/floors/check' --raise"
}

# Run s/floors/update with the given counts on standard input.
update() {
	local counts="$1"

	run bash -c "printf '%b' '${counts}' | bash '${repo}/s/floors/update'"
}

@test "a count at or above its floor passes" {
	check 'bandit-lines 1000\nmypy-files 18\n'

	[ "$status" -eq 0 ]
	[[ "$output" == *"bandit-lines: 1000, floor 900"* ]]
	[[ "$output" == *"mypy-files: 18, floor 18"* ]]
}

@test "a count below its floor fails" {
	check 'bandit-lines 899\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"899 is below its floor of 900"* ]]
}

@test "a hook that checked nothing fails" {
	check 'bandit-lines 0\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"below its floor"* ]]
}

@test "a stale floor passes, and is only reported without --raise" {
	check 'bandit-lines 1286\n'

	[ "$status" -eq 0 ]
	[[ "$output" == *"floor 900, which is below 70% of the count"* ]]
	grep -qx 'bandit-lines 900  # 90% of 1000, measured 2026-11-19' "${minimums}"
}

@test "--raise raises a stale floor to 90% of the count" {
	check_raising 'bandit-lines 1286\n'

	[ "$status" -eq 0 ]
	[[ "$output" == *"floor raised from 900 to 1157"* ]]
	grep -qE '^bandit-lines 1157  # 90% of 1286, measured [0-9]{4}-[0-9]{2}-[0-9]{2}$' "${minimums}"
	grep -qx 'mypy-files 18  # 90% of 21, measured 2026-11-19' "${minimums}"
}

@test "--raise leaves a floor at 70% of its count alone" {
	check_raising 'bandit-lines 1285\n'

	[ "$status" -eq 0 ]
	[[ "$output" == *"bandit-lines: 1285, floor 900"* ]]
	grep -qx 'bandit-lines 900  # 90% of 1000, measured 2026-11-19' "${minimums}"
}

@test "--raise never lowers a floor" {
	check_raising 'bandit-lines 899\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"899 is below its floor of 900"* ]]
	grep -qx 'bandit-lines 900  # 90% of 1000, measured 2026-11-19' "${minimums}"
}

@test "an unknown option fails" {
	run bash -c "printf 'bandit-lines 1000\n' | bash '${repo}/s/floors/check' --lower"

	[ "$status" -eq 1 ]
	[[ "$output" == *"Unknown option '--lower'"* ]]
}

@test "a check with no floor fails" {
	check 'cspell-files 49\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"cspell-files: no floor"* ]]
}

@test "one failure does not hide the others' results" {
	check 'bandit-lines 1\nmypy-files 21\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"mypy-files: 21, floor 18"* ]]
}

@test "a count that is not a number fails" {
	check 'bandit-lines lots\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"'lots' is not a count"* ]]
}

@test "no counts at all fails" {
	check ''

	[ "$status" -eq 1 ]
	[[ "$output" == *"No counts were given"* ]]
}

@test "a missing minimums file fails" {
	rm "${minimums}"

	check 'bandit-lines 1000\n'

	[ "$status" -eq 1 ]
	[[ "$output" == *"s/floors/minimums is missing"* ]]
}

@test "update sets a floor to 90% of the count, rounding down" {
	update 'bandit-lines 2005\n'

	[ "$status" -eq 0 ]
	grep -qE '^bandit-lines 1804  # 90% of 2005, measured [0-9]{4}-[0-9]{2}-[0-9]{2}$' "${minimums}"
}

@test "update leaves the other floors and the comments as they were" {
	update 'bandit-lines 2005\n'

	[ "$status" -eq 0 ]
	grep -qx '# Floors under the checks.' "${minimums}"
	grep -qx 'mypy-files 18  # 90% of 21, measured 2026-11-19' "${minimums}"
	[ "$(grep -c '^bandit-lines ' "${minimums}")" -eq 1 ]
}

@test "update adds a floor for a new check" {
	update 'cspell-files 49\n'

	[ "$status" -eq 0 ]
	grep -qE '^cspell-files 44  # 90% of 49' "${minimums}"
}

@test "update writes floors that check then passes" {
	update 'bandit-lines 5000\nmypy-files 40\n'

	check 'bandit-lines 5000\nmypy-files 40\n'

	[ "$status" -eq 0 ]
}

@test "update refuses a count that is not a number" {
	run bash -c "printf 'bandit-lines lots\n' | bash '${repo}/s/floors/update'"

	[ "$status" -eq 1 ]
	grep -qx 'bandit-lines 900  # 90% of 1000, measured 2026-11-19' "${minimums}"
}
