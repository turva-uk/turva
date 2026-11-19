#!/usr/bin/env bats
# A producer or routing failure must never leave a partially raised floor.
# Each fixture has copied consumers and synthetic count/reach producers only.
# shellcheck disable=SC2030,SC2031
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	minimums="${repo}/s/floors/minimums"
	mkdir -p "${repo}/s/floors" "${repo}/s/utils"
	cp "${BATS_TEST_DIRNAME}/../floors/"{check,update,hooks,refresh} "${repo}/s/floors/"
	cp "${BATS_TEST_DIRNAME}/../utils/floors.py" "${repo}/s/utils/floors.py"
	cat >"${minimums}" <<'EOF'
# Synthetic floors.
bandit-lines 900
mypy-files 18
cspell-files 44
zizmor-files 4
dev-details-files 410
EOF
	cp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	cat >"${repo}/s/floors/hook-counts" <<'EOF'
#!/usr/bin/env bash
printf 'bandit-lines 2005\nmypy-files 21\ncspell-files 50\nzizmor-files 5\n'
if [ "${COUNT_MODE}" != missing ]; then printf 'dev-details-files 500\n'; fi
exit "${COUNT_STATUS}"
EOF
	cat >"${repo}/s/floors/reach" <<'EOF'
#!/usr/bin/env bash
echo checked >"${BATS_TEST_TMPDIR}/reach-called"
exit "${REACH_STATUS}"
EOF
	chmod +x "${repo}/s/floors/"{hook-counts,reach}
	export COUNT_STATUS=0 REACH_STATUS=0 COUNT_MODE=valid
}

@test "failed measurement producers cannot change floors even after printing valid rows" {
	export COUNT_STATUS=1
	run "${repo}/s/floors/hooks" --raise
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	[ -e "${BATS_TEST_TMPDIR}/reach-called" ]
}

@test "failed reach checks leave every floor unchanged" {
	export REACH_STATUS=1
	run "${repo}/s/floors/hooks" --raise
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	[[ "$output" != *'floor raised'* ]]
}

@test "a successful complete hook transaction can raise a stale floor" {
	run "${repo}/s/floors/hooks" --raise
	[ "$status" -eq 0 ]
	grep -q '^bandit-lines 1804 ' "${minimums}"
	grep -qx 'mypy-files 18' "${minimums}"
}

@test "a successful but incomplete measurement stream is rejected before mutation" {
	export COUNT_MODE=missing
	run "${repo}/s/floors/hooks" --raise
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "explicit refresh also checks producer success before invoking its updater" {
	export COUNT_STATUS=1
	run "${repo}/s/floors/refresh"
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "explicit refresh refuses a failed reach or an incomplete expected scope" {
	export REACH_STATUS=1
	run "${repo}/s/floors/refresh"
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
	export REACH_STATUS=0 COUNT_MODE=missing
	run "${repo}/s/floors/refresh"
	[ "$status" -eq 1 ]
	cmp "${minimums}" "${BATS_TEST_TMPDIR}/before"
}

@test "explicit refresh publishes one complete monotonic update" {
	run "${repo}/s/floors/refresh"
	[ "$status" -eq 0 ]
	grep -q '^bandit-lines 1804 ' "${minimums}"
	grep -q '^mypy-files 18' "${minimums}"
	grep -q '^cspell-files 45 ' "${minimums}"
}

@test "the full lint entry point requests a ratchet locally but stays read-only in CI" {
	local bin="${BATS_TEST_TMPDIR}/bin"
	mkdir "${bin}"
	cp "${BATS_TEST_DIRNAME}/../lint" "${repo}/s/lint"
	printf '#!/usr/bin/env bash\nexit 0\n' >"${bin}/pre-commit"
	printf '#!/usr/bin/env bash\nexit 0\n' >"${bin}/git"
	cat >"${repo}/s/floors/hooks" <<'EOF'
#!/usr/bin/env bash
printf '%s' "$*" >"${BATS_TEST_TMPDIR}/floor-options"
EOF
	chmod +x "${bin}/"{pre-commit,git}
	run env CI=true PATH="${bin}:${PATH}" "${repo}/s/lint"
	[ "$status" -eq 0 ]
	[ ! -s "${BATS_TEST_TMPDIR}/floor-options" ]
	run env -u CI PATH="${bin}:${PATH}" "${repo}/s/lint"
	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/floor-options")" = --raise ]
}
