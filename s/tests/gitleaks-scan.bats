#!/usr/bin/env bats
# Tests for s/gitleaks/scan-commits. Each test runs a copy of the script in a
# scratch git repository, with a stand-in for gitleaks, so no real scan
# runs. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	calls="${BATS_TEST_TMPDIR}/gitleaks.log"

	mkdir -p "${repo}/s/gitleaks" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../gitleaks/scan-commits" "${repo}/s/gitleaks/scan-commits"
	echo "[extend]" >"${repo}/.gitleaks.toml"

	git -C "${repo}" init -q
	git -C "${repo}" config user.name "Test"
	git -C "${repo}" config user.email "test@example.com"
	git -C "${repo}" commit -q --allow-empty -m "base"
	git -C "${repo}" tag base
	git -C "${repo}" commit -q --allow-empty -m "change"

	# gitleaks records each call. `dir`, the canary check, exits with
	# $DIR_STATUS, and `git`, the real scan, with $GIT_STATUS.
	cat >"${bin}/gitleaks" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TEST_TMPDIR}/gitleaks.log"
case "$1" in
	dir) exit "${DIR_STATUS}" ;;
	git) exit "${GIT_STATUS}" ;;
esac
EOF

	chmod +x "${bin}/gitleaks"
	export PATH="${bin}:${PATH}"
	export DIR_STATUS=1
	export GIT_STATUS=0

	touch "${calls}"
}

@test "scans the branch's commits once the rules are shown to fire" {
	run bash "${repo}/s/gitleaks/scan-commits" base

	[ "$status" -eq 0 ]
	[[ "$output" == *"Scanning 1 commit(s) not on base"* ]]
	grep -q -- "--log-opts=base..HEAD" "${calls}"
}

@test "fails when gitleaks finds a secret" {
	export GIT_STATUS=1

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
	cat >"${bin}/gitleaks" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "dir" ]; then
	cat "${@: -1}/settings.ini" >>"${BATS_TEST_TMPDIR}/canary.txt"
	exit 1
fi
EOF

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
