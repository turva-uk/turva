#!/usr/bin/env bats
# Complete-report enforcement uses a synthetic module, not an installed
# scanner. The real pinned hook runs separately in the shared lint gate.

# Bats isolates each test's deliberately exported scanner response.
# shellcheck disable=SC2030,SC2031
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	module="${BATS_TEST_TMPDIR}/module"
	script="${repo}/s/utils/bandit-check.py"
	mkdir -p "${repo}/s/utils" "${repo}/app" "${module}"
	cp "${BATS_TEST_DIRNAME}/../utils/bandit-check.py" "${script}"
	printf 'value = 1\n' >"${repo}/app/source.py"
	printf 'other = 2\n' >"${repo}/app/other.py"
	cat >"${module}/bandit.py" <<'PY'
import json, os, sys
from pathlib import Path
mode = os.environ['REPORT_MODE']
files = sys.argv[sys.argv.index('--') + 1:]
Path(os.environ['CALLS']).write_text(json.dumps(sys.argv[1:]))
report = {'errors': [], 'metrics': {path: {'loc': 1} for path in files}, 'results': []}
report['metrics']['_totals'] = {'loc': len(files)}
if mode == 'skipped': report['errors'] = [{'filename': files[0], 'reason': 'syntax error'}]
if mode == 'missing-errors': del report['errors']
if mode == 'missing-source': del report['metrics'][files[0]]
if mode == 'wrong-total': report['metrics']['_totals']['loc'] = 100
if mode == 'boolean-count': report['metrics']['_totals']['loc'] = True
if mode == 'missing-total': del report['metrics']['_totals']
if mode == 'extra-source': report['metrics']['app/other.py'] = {'loc': 1}
if mode == 'duplicate-source': report['metrics']['./' + files[0]] = {'loc': 1}
if mode in ('finding', 'finding-success', 'wrong-rule', 'wrong-line', 'outside-finding'):
    report['results'] = [{'filename': files[0], 'test_id': 'B101', 'line_number': 1,
                          'code': 'synthetic-private-source-must-not-be-printed'}]
if mode == 'wrong-rule': report['results'][0]['test_id'] = 'INJECTED\nRULE'
if mode == 'wrong-line': report['results'][0]['line_number'] = True
if mode == 'outside-finding': report['results'][0]['filename'] = 'app/other.py'
if mode == 'empty-file':
    report['metrics'][files[0]]['loc'] = 0
    report['metrics']['_totals']['loc'] = 0
content = json.dumps(report)
if mode == 'malformed': content = 'not json'
if mode == 'missing-report': content = ''
if mode == 'object': content = '[]'
if mode == 'duplicate-key': content = content.replace('"errors": []', '"errors": [], "errors": []')
if mode == 'oversized': content = ' ' * (16 * 1024 * 1024 + 1)
print(content)
print('synthetic-private-scanner-error-must-not-be-printed', file=sys.stderr)
sys.exit(1 if mode in ('finding', 'wrong-rule', 'wrong-line', 'outside-finding', 'error-status') else 2 if mode == 'tool-error' else 0)
PY
	export PYTHONPATH="${module}" REPORT_MODE=valid CALLS="${BATS_TEST_TMPDIR}/calls.json"
}

@test "a complete scan reports every requested file's validated line count" {
	run python3 "${script}" app/source.py app/other.py
	[ "$status" -eq 0 ]
	[[ "$output" == *"Total lines of code: 2"* ]]
	[[ "$output" == *"Files skipped (0):"* ]]
	[[ "$output" != *synthetic-private* ]]
}

@test "the scanner receives fixed policy arguments and filenames behind a separator" {
	run python3 "${script}" app/source.py
	[ "$status" -eq 0 ]
	run python3 - "${CALLS}" <<'PY'
import json, sys
from pathlib import Path
assert json.loads(Path(sys.argv[1]).read_text()) == ['--quiet', '--skip', 'B404', '--format', 'json', '--', 'app/source.py']
PY
	[ "$status" -eq 0 ]
}

@test "syntax-skipped inputs fail even when the scanner exits successfully" {
	export REPORT_MODE=skipped
	run python3 "${script}" app/source.py
	[ "$status" -eq 2 ]
	[[ "$output" == *"no clean result is claimed"* ]]
	[[ "$output" != *"Files skipped (0)"* ]]
}

@test "incomplete ambiguous and malformed report evidence is rejected" {
	local mode
	for mode in missing-errors missing-source wrong-total boolean-count missing-total extra-source duplicate-source malformed missing-report object duplicate-key oversized wrong-rule wrong-line outside-finding; do
		export REPORT_MODE="${mode}"
		run python3 "${script}" app/source.py
		[ "$status" -eq 2 ]
		[[ "$output" == *"could not prove a complete scan"* ]]
		[[ "$output" != *synthetic-private* ]]
		[[ "$output" != *INJECTED* ]]
	done
}

@test "scanner errors and inconsistent finding statuses are not clean results" {
	local mode
	for mode in tool-error error-status finding-success; do
		export REPORT_MODE="${mode}"
		run python3 "${script}" app/source.py
		[ "$status" -eq 2 ]
		[[ "$output" == *"no clean result is claimed"* ]]
	done
}

@test "a genuine finding shows its rule and line but never source or scanner stderr" {
	export REPORT_MODE=finding
	run python3 "${script}" app/source.py
	[ "$status" -eq 1 ]
	[[ "$output" == *"app/source.py:1: bandit B101"* ]]
	[[ "$output" != *synthetic-private* ]]
}

@test "a genuinely empty but covered Python file remains valid" {
	export REPORT_MODE=empty-file
	run python3 "${script}" app/source.py
	[ "$status" -eq 0 ]
	[[ "$output" == *"Total lines of code: 0"* ]]
}

@test "missing duplicate and outside-checkout requests stop before scanning" {
	run python3 "${script}" app/missing.py
	[ "$status" -eq 2 ]
	[ ! -e "${CALLS}" ]
	run python3 "${script}" app/source.py app/source.py
	[ "$status" -eq 2 ]
	[ ! -e "${CALLS}" ]
	echo secret >"${BATS_TEST_TMPDIR}/outside.py"
	run python3 "${script}" "${BATS_TEST_TMPDIR}/outside.py"
	[ "$status" -eq 2 ]
	[ ! -e "${CALLS}" ]
}

@test "direct invocation uses the containing checkout rather than the calling folder" {
	cd "${BATS_TEST_TMPDIR}" || return 1
	run python3 "${script}" app/source.py
	[ "$status" -eq 0 ]
}

@test "an absent requested scope cannot be reported as a clean scan" {
	run python3 "${script}"
	[ "$status" -eq 2 ]
	[ ! -e "${CALLS}" ]
}

@test "a scanner timeout fails without a report or a clean claim" {
	run python3 - "${script}" <<'PY'
import importlib.util, subprocess, sys
spec = importlib.util.spec_from_file_location('bandit_check', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
def timeout(*args, **kwargs):
    assert kwargs['timeout'] == 120
    raise subprocess.TimeoutExpired('synthetic-scanner', 120)
module.subprocess.run = timeout
module.sys.argv = [sys.argv[1], 'app/source.py']
assert module.main() == 2
PY
	[ "$status" -eq 0 ]
	[[ "$output" == *"no clean result is claimed"* ]]
	[ ! -e "${CALLS}" ]
}
