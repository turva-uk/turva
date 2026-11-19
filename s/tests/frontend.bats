#!/usr/bin/env bats
# Exercise host npm and Compose entry points with copied scripts and stand-ins.
# No packages are installed, Docker started or real Git configuration changed.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s/utils" "${repo}/frontend" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../frontend" "${repo}/s/frontend"
	cp "${BATS_TEST_DIRNAME}/../up" "${repo}/s/up"
	cp "${BATS_TEST_DIRNAME}/../utils/frontend-directory.sh" "${repo}/s/utils/frontend-directory.sh"
	cat >"${bin}/npm" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"${BATS_TEST_TMPDIR}/npm.log"
EOF
	cat >"${bin}/docker" <<'EOF'
#!/usr/bin/env bash
[ -d frontend/node_modules ] && [ -w frontend/node_modules ] || exit 99
printf '%s\n' "$*" >>"${BATS_TEST_TMPDIR}/docker.log"
EOF
	chmod +x "${bin}/npm" "${bin}/docker"
	export PATH="${bin}:${PATH}" CI=true
}

@test "an empty directory from hook setup is not treated as installed packages" {
	mkdir -p "${repo}/frontend/node_modules"

	run "${repo}/s/frontend" typecheck

	[ "$status" -eq 0 ]
	[ "$(sed -n 1p "${BATS_TEST_TMPDIR}/npm.log")" = "ci --no-fund --no-audit" ]
	[ "$(sed -n 2p "${BATS_TEST_TMPDIR}/npm.log")" = "run typecheck" ]
}

@test "an explicit install runs npm ci only once and forwards arguments" {
	run "${repo}/s/frontend" install --ignore-scripts

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/npm.log")" = "ci --no-fund --no-audit --ignore-scripts" ]
}

@test "an installed frontend runs the requested script without reinstalling" {
	mkdir -p "${repo}/frontend/node_modules/.bin"
	printf '#!/usr/bin/env bash\nexit 0\n' >"${repo}/frontend/node_modules/.bin/vite"
	chmod +x "${repo}/frontend/node_modules/.bin/vite"

	run "${repo}/s/frontend" build -- --emptyOutDir

	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/npm.log")" = "run build -- --emptyOutDir" ]
}

@test "Compose prepares the caller-owned frontend directory without hook setup" {
	run "${repo}/s/up" -d web

	[ "$status" -eq 0 ]
	[ -d "${repo}/frontend/node_modules" ]
	[ "$(cat "${BATS_TEST_TMPDIR}/docker.log")" = "compose up --detach --wait -d web" ]
	[ ! -e "${BATS_TEST_TMPDIR}/npm.log" ]
}
