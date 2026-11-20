#!/usr/bin/env bats
# Tests for s/floors/check and s/floors/update, which hold each check's
# count against its floor in s/floors/minimums. Each test runs copies of the
# scripts beside a made-up minimums file. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	minimums="${repo}/s/floors/minimums"

	mkdir -p "${repo}/s/floors" "${repo}/s/utils"
	cp "${BATS_TEST_DIRNAME}/../floors/check" "${BATS_TEST_DIRNAME}/../floors/update" "${repo}/s/floors/"
	cp "${BATS_TEST_DIRNAME}/../utils/floors.py" "${repo}/s/utils/floors.py"

	cat >"${minimums}" <<'EOF'
# Floors under the checks.
bandit-lines 900  # 90% of 1000, measured 2026-11-19
mypy-files 18  # 90% of 21, measured 2026-11-19
EOF
}

# Run s/floors/check with the given counts on standard input.
check() {
	local counts="$1"

	run bash -c 'printf "%b" "$1" | bash "$2"' _ "${counts}" "${repo}/s/floors/check"
}

# Run s/floors/check --raise with the given counts on standard input.
check_raising() {
	local counts="$1"

	run bash -c 'printf "%b" "$1" | bash "$2" --raise' _ "${counts}" "${repo}/s/floors/check"
}

# Run s/floors/update with the given counts on standard input.
update() {
	local counts="$1"

	run bash -c 'printf "%b" "$1" | bash "$2"' _ "${counts}" "${repo}/s/floors/update"
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
	[[ "$output" == *"--lower"* ]]
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

@test "a later invalid updater record leaves every floor byte unchanged" {
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update 'bandit-lines 2005\nmypy-files invalid\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "a later below-floor result prevents every earlier stale-floor raise" {
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	check_raising 'bandit-lines 2005\nmypy-files 1\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	[[ "$output" != *"floor raised"* ]]
}

@test "duplicate measured checks are rejected before mutation" {
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update 'bandit-lines 2005\nbandit-lines 2006\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	check 'bandit-lines 1000\nbandit-lines 1001\n'
	[ "$status" -eq 1 ]
}

@test "empty update and malformed extra fields cannot report success" {
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update ''
	[ "$status" -eq 1 ]
	update 'bandit-lines 2005 extra\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "the final unterminated count is checked rather than silently dropped" {
	check 'bandit-lines 1000\nmypy-files 1'
	[ "$status" -eq 1 ]
	[[ "$output" == *"mypy-files"* ]]
}

@test "explicit refreshes never lower existing floors" {
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update 'bandit-lines 950\n'
	[ "$status" -eq 0 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update 'bandit-lines 899\nmypy-files 100\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "malformed or duplicate floor records fail without repair or mutation" {
	local record
	cp "${minimums}" "${BATS_TEST_TMPDIR}/baseline"
	for record in 'bandit-lines 901' 'other invalid' 'bad row extra'; do
		cp "${BATS_TEST_TMPDIR}/baseline" "${minimums}"
		printf '\n%s\n' "${record}" >>"${minimums}"
		cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
		check_raising 'bandit-lines 2005\n'
		[ "$status" -eq 1 ]
		cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	done
}

@test "all expected measurements must exist exactly once" {
	run bash -c 'printf "bandit-lines 2005\n" | bash "$1" --raise --expect bandit-lines mypy-files' _ "${repo}/s/floors/check"
	[ "$status" -eq 1 ]
	grep -qx 'bandit-lines 900  # 90% of 1000, measured 2026-11-19' "${minimums}"
	run bash -c 'printf "bandit-lines 2005\nmypy-files 30\n" | bash "$1" --raise --expect bandit-lines mypy-files' _ "${repo}/s/floors/check"
	[ "$status" -eq 0 ]
}

@test "extra options after a valid flag are not ignored" {
	run bash -c 'printf "bandit-lines 2005\n" | bash "$1" --raise --lower' _ "${repo}/s/floors/check"
	[ "$status" -eq 1 ]
}

@test "atomic floor publication retains file permissions and unrelated lines" {
	chmod 640 "${minimums}"
	update 'bandit-lines 2005\n'
	[ "$status" -eq 0 ]
	[ "$(stat -c %a "${minimums}")" = 640 ]
	grep -qx '# Floors under the checks.' "${minimums}"
	grep -qx 'mypy-files 18  # 90% of 21, measured 2026-11-19' "${minimums}"
}

@test "a tiny positive measurement creates a positive floor and zero does not" {
	update 'new-check 1\n'
	[ "$status" -eq 0 ]
	grep -q '^new-check 1 ' "${minimums}"
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	update 'empty-check 0\n'
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "failed atomic replacement leaves original bytes and no temporary residue" {
	run python3 - "${repo}/s/utils/floors.py" "${minimums}" <<'PY'
from pathlib import Path
import importlib.util, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('floor_boundary', sys.argv[1])
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
path = Path(sys.argv[2]); before = path.read_bytes()
with patch.object(module.os, 'replace', side_effect=OSError('synthetic publication failure')):
    try:
        module.apply({'bandit-lines': 2005}, update=True, raise_stale=False)
    except OSError:
        pass
    else:
        raise AssertionError('publication failure was hidden')
assert path.read_bytes() == before
assert not list(path.parent.glob('.minimums-*'))
PY
	[ "$status" -eq 0 ]
}

@test "concurrent monotonic updates retain the higher floor without partial records" {
	run python3 - "${repo}/s/floors/update" "${minimums}" <<'PY'
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess, sys
def update(count):
    return subprocess.run(['bash', sys.argv[1]], input=f'bandit-lines {count}\n', text=True, capture_output=True).returncode
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(update, [2005, 3005]))
assert all(result in (0, 1) for result in results) and 0 in results
text = Path(sys.argv[2]).read_text()
assert any(line.startswith('bandit-lines 2704 ') for line in text.splitlines())
assert text.count('bandit-lines ') == 1 and 'mypy-files 18' in text
PY
	[ "$status" -eq 0 ]
}

@test "oversized and invalid UTF-8 count or floor streams fail before publication" {
	run python3 - "${repo}/s/floors/update" "${minimums}" <<'PY'
from pathlib import Path
import subprocess, sys
command, path = ['bash', sys.argv[1]], Path(sys.argv[2])
original = path.read_bytes()
for content in (b'bandit-lines 2005\n' + b'x' * 1_048_576, b'bandit-lines 2005\n\xff'):
    result = subprocess.run(command, input=content, capture_output=True)
    assert result.returncode == 1 and path.read_bytes() == original
for content in (original + b'#' * 1_048_576, original + b'\xff'):
    path.write_bytes(content)
    result = subprocess.run(command, input=b'bandit-lines 2005\n', capture_output=True)
    assert result.returncode == 1 and path.read_bytes() == content
PY
	[ "$status" -eq 0 ]
}

@test "an external edit during publication is retained rather than overwritten" {
	run python3 - "${repo}/s/utils/floors.py" "${minimums}" <<'PY'
from pathlib import Path
import importlib.util, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('floor_boundary', sys.argv[1])
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
path = Path(sys.argv[2]); changed = path.read_bytes() + b'# external edit\n'
original_sync = module.os.fsync
def sync_then_edit(fd):
    original_sync(fd)
    path.write_bytes(changed)
with patch.object(module.os, 'fsync', side_effect=sync_then_edit):
    try:
        module.apply({'bandit-lines': 2005}, update=True, raise_stale=False)
    except module.FloorError:
        pass
    else:
        raise AssertionError('changed floor content was overwritten')
assert path.read_bytes() == changed and not list(path.parent.glob('.minimums-*'))
PY
	[ "$status" -eq 0 ]
}
