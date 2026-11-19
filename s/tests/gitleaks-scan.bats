#!/usr/bin/env bats
# Tests for s/gitleaks/scan-commits. Each test runs a copy of the script in a
# scratch git repository, with a stand-in for gitleaks, so no real scan
# runs. Run with: bats s/tests

# Bats intentionally isolates each test's exported scanner response.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	calls="${BATS_TEST_TMPDIR}/gitleaks.log"

	mkdir -p "${repo}/s/gitleaks" "${repo}/s/utils" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../gitleaks/scan-commits" "${repo}/s/gitleaks/scan-commits"
	cp "${BATS_TEST_DIRNAME}/../utils/gitleaks-report.py" "${repo}/s/utils/gitleaks-report.py"
	echo "[extend]" >"${repo}/.gitleaks.toml"

	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	git -C "${repo}" init -q
	git -C "${repo}" config user.name "Test"
	git -C "${repo}" config user.email "test@example.com"
	git -C "${repo}" config commit.gpgsign false
	git -C "${repo}" commit -q --allow-empty -m "base"
	git -C "${repo}" tag base
	git -C "${repo}" commit -q --allow-empty -m "change"

# gitleaks records each call. `dir`, the canary check, exits with
	# $DIR_STATUS, and `git`, the real scan, with $GIT_STATUS.
	cat >"${bin}/gitleaks" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TEST_TMPDIR}/gitleaks.log"
case "$1" in
	dir)
		report=""
		for argument in "$@"; do
			case "$argument" in --report-path=*) report=${argument#*=} ;; esac
		done
		if [ -n "${CAPTURE_CANARY:-}" ]; then
			cat "${@: -1}/settings.ini" >>"${BATS_TEST_TMPDIR}/canary.txt"
		fi
		if [ -n "$report" ] && [ "${REPORT_MODE}" != "missing" ]; then
			python3 - "$report" "${@: -1}/settings.ini" <<'PY'
import json, os, sys
from pathlib import Path
mode = os.environ["REPORT_MODE"]
item = {"RuleID": "github-pat", "File": sys.argv[2], "StartLine": 1,
        "EndLine": 1, "Secret": "REDACTED", "Match": "REDACTED"}
if mode == "wrong-rule": item["RuleID"] = "another-rule"
if mode == "wrong-file": item["File"] = "elsewhere.ini"
if mode == "wrong-line": item["StartLine"] = 9
if mode == "boolean-line": item["StartLine"] = True
if mode == "wrong-end-line": item["EndLine"] = 9
if mode == "invalid-file": item["File"] = None
if mode == "unredacted": item["Secret"] = "synthetic-unredacted-value"
value = [] if mode == "empty" else [item]
if mode == "object": value = item
if mode == "multiple": value.append(item)
if mode == "oversized": value = " " * 1_048_577
Path(sys.argv[1]).write_text("not-json" if mode == "malformed" else json.dumps(value))
PY
		fi
		exit "${DIR_STATUS}"
		;;
	git) exit "${GIT_STATUS}" ;;
esac
EOF

	chmod +x "${bin}/gitleaks"
	export PATH="${bin}:${PATH}"
	export DIR_STATUS=42 REPORT_MODE=valid
	export GIT_STATUS=0

	touch "${calls}"
}

@test "scans the branch's commits once the rules are shown to fire" {
	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 1 commit(s)"* ]]
	local base head
	base=$(git -C "${repo}" rev-parse base)
	head=$(git -C "${repo}" rev-parse HEAD)
	grep -q -- "--log-opts=${base}..${head}" "${calls}"
}

@test "fails when gitleaks finds a secret" {
	export GIT_STATUS=42

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 1 ]
	[[ "$output" == *"found something that looks like a secret"* ]]
}

@test "refuses to scan when the planted key is not reported" {
	export DIR_STATUS=0

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 1 ]
	[[ "$output" == *"rules are not firing"* ]]
	run ! grep -q "^git " "${calls}"
}

@test "plants a key the canary check can find" {
	export CAPTURE_CANARY=1

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 0 ]
	grep -qE 'GITHUB_TOKEN = "ghp_[0-9A-Za-z]{36}"' "${BATS_TEST_TMPDIR}/canary.txt"
}

@test "fails without a base ref" {
	run bash "${repo}/s/gitleaks/scan-commits"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No base ref given"* ]]
}

@test "fails when the base ref is not a commit" {
	run bash "${repo}/s/gitleaks/scan-commits" origin/missing

	[ "$status" -eq 1 ]
	[[ "$output" == *"not a commit this checkout has"* ]]
}

@test "fails when .gitleaks.toml is missing" {
	rm "${repo}/.gitleaks.toml"

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 1 ]
	[[ "$output" == *".gitleaks.toml is missing"* ]]
	run ! grep -q "." "${calls}"
}

@test "a canary scanner error is never accepted as detection" {
	export DIR_STATUS=127

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -ne 0 ]
	[[ "$output" == *"Canary scan failed"* ]]
	run ! grep -q '^git ' "${calls}"
}

@test "findings exit status alone is insufficient without positive report evidence" {
	local mode
	for mode in missing empty malformed wrong-rule wrong-file wrong-line boolean-line wrong-end-line invalid-file unredacted object multiple oversized; do
		export REPORT_MODE="${mode}"
		run bash "${repo}/s/gitleaks/scan-commits" base
		[ "$status" -ne 0 ]
		[[ "$output" == *"Canary report"* ]]
		run ! grep -q '^git ' "${calls}"
	done
}

@test "a real scanner error is not described as a detected secret" {
	export GIT_STATUS=2

	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -ne 0 ]
	[[ "$output" == *"could not complete"* ]]
	[[ "$output" != *"found something that looks like a secret"* ]]
}

@test "manual full-history scanning includes the initial commit" {
	run bash "${repo}/s/gitleaks/scan-commits" --all

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 2 commit(s)"* ]]
	grep -q -- "--log-opts=$(git -C "${repo}" rev-parse HEAD)" "${calls}"
}

@test "a new-history push with an all-zero base scans full history" {
	run bash "${repo}/s/gitleaks/scan-commits" 0000000000000000000000000000000000000000

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 2 commit(s)"* ]]
}

@test "an invalid explicit head stops before the canary or real scan" {
	run bash "${repo}/s/gitleaks/scan-commits" base missing-head

	[ "$status" -ne 0 ]
	[[ "$output" == *"head is not a commit"* ]]
	[ ! -s "${calls}" ]
}

@test "option-shaped refs cannot become scanner log options" {
	run bash "${repo}/s/gitleaks/scan-commits" --not-a-ref

	[ "$status" -ne 0 ]
	[ ! -s "${calls}" ]
}

@test "an explicit head is not silently replaced by a newer HEAD" {
	local selected base
	selected=$(git -C "${repo}" rev-parse HEAD)
	base=$(git -C "${repo}" rev-parse base)
	git -C "${repo}" commit -q --allow-empty -m newer

	run bash "${repo}/s/gitleaks/scan-commits" base "${selected}"

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 1 commit(s)"* ]]
	grep -q -- "--log-opts=${base}..${selected}" "${calls}"
}

@test "inherited Git routing cannot scan another repository's clean history" {
	local other="${BATS_TEST_TMPDIR}/other"
	git init -q "${other}"
	git -C "${other}" -c user.name=Fixture -c user.email=fixture@example.invalid -c commit.gpgsign=false commit -qm foreign --allow-empty

	run env GIT_DIR="${other}/.git" GIT_WORK_TREE="${other}" GIT_COMMON_DIR="${other}/.git" GIT_INDEX_FILE="${other}/.git/index" bash "${repo}/s/gitleaks/scan-commits" --all

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 2 commit(s)"* ]]
	grep -q -- "--log-opts=$(git -C "${repo}" rev-parse HEAD)" "${calls}"
}
