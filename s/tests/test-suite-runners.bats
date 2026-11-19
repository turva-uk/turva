#!/usr/bin/env bats
# Copied full/filtered runner entry points, with no real suite, package install
# or Docker operation. Bats isolates every deliberately exported response.
# shellcheck disable=SC2030,SC2031
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	log="${BATS_TEST_TMPDIR}/calls"
	mkdir -p "${repo}/s/floors" "${repo}/s/utils" "${repo}/.venv/bin" "${repo}/frontend/node_modules/.bin" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../"{test,frontend} "${repo}/s/"
	cp "${BATS_TEST_DIRNAME}/../utils/frontend-directory.sh" "${repo}/s/utils/"
	printf '#!/usr/bin/env bash\nexit 0\n' >"${repo}/frontend/node_modules/.bin/vite"
	cat >"${repo}/.venv/bin/python" <<'EOF'
#!/usr/bin/env bash
echo "python $*" >>"${BATS_TEST_TMPDIR}/calls"
exit "${PYTEST_STATUS:-0}"
EOF
	cat >"${bin}/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >>"${BATS_TEST_TMPDIR}/calls"
exit "${DJANGO_STATUS:-0}"
EOF
	cat >"${bin}/bats" <<'EOF'
#!/usr/bin/env bash
echo "bats $*" >>"${BATS_TEST_TMPDIR}/calls"
exit "${BATS_STATUS:-0}"
EOF
	cat >"${bin}/npm" <<'EOF'
#!/usr/bin/env bash
echo "npm $*" >>"${BATS_TEST_TMPDIR}/calls"
[ "${2:-}" != "${FAILED_NPM:-not-a-script}" ]
EOF
	cat >"${repo}/s/floors/tests" <<'EOF'
#!/usr/bin/env bash
echo "floors $*" >>"${BATS_TEST_TMPDIR}/calls"
exit "${FLOOR_STATUS:-0}"
EOF
	chmod +x "${repo}/frontend/node_modules/.bin/vite" "${repo}/.venv/bin/python" "${bin}/"{docker,bats,npm} "${repo}/s/floors/tests"
	export PATH="${bin}:${PATH}" CI=true
}

@test "a full test run retains all three suites before a read-only CI floor transaction" {
	run "${repo}/s/test"
	[ "$status" -eq 0 ]
	[ "$(cat "${log}")" = 'python -m pytest safety_file -q
bats s/tests
docker compose exec -T web pytest app
floors safety-file django bats' ]
}

@test "a local full test run requests a ratchet only after every suite passes" {
	run env -u CI "${repo}/s/test"
	[ "$status" -eq 0 ]
	[ "$(tail -n 1 "${log}")" = 'floors --raise safety-file django bats' ]
}

@test "any full-suite failure prevents floor mutation" {
	local variable
	for variable in PYTEST_STATUS BATS_STATUS DJANGO_STATUS; do
		rm -f "${log}"
		run env "${variable}=1" "${repo}/s/test"
		[ "$status" -eq 1 ]
		run ! grep -q '^floors ' "${log}"
	done
}

@test "filtered pytest and Bats runs keep their arguments without full-suite floors" {
	run "${repo}/s/test" safety_file -k risk
	[ "$status" -eq 0 ]
	grep -qx 'python -m pytest safety_file -k risk' "${log}"
	run "${repo}/s/test" s/tests --filter synthetic
	[ "$status" -eq 0 ]
	grep -qx 'bats s/tests --filter synthetic' "${log}"
	run "${repo}/s/test" -k login
	[ "$status" -eq 0 ]
	grep -qx 'docker compose exec -T web pytest -k login' "${log}"
	run ! grep -q '^floors ' "${log}"
}

@test "a full frontend gate completes both builds before its read-only unit floor" {
	run "${repo}/s/frontend"
	[ "$status" -eq 0 ]
	[ "$(cat "${log}")" = 'npm run typecheck
npm run lint
npm run format
npm run test:ci
npm run build
npm run build-storybook
floors vitest' ]
}

@test "local frontend ratchets only after success and failures leave floors alone" {
	run env -u CI "${repo}/s/frontend"
	[ "$status" -eq 0 ]
	[ "$(tail -n 1 "${log}")" = 'floors --raise vitest' ]
	local script
	for script in test:ci build build-storybook; do
		rm "${log}"
		run env FAILED_NPM="${script}" "${repo}/s/frontend"
		[ "$status" -eq 1 ]
		run ! grep -q '^floors ' "${log}"
	done
}

@test "explicit frontend scripts and filtered tests do not apply a full-unit floor" {
	run "${repo}/s/frontend" test:ci -- --testNamePattern=synthetic
	[ "$status" -eq 0 ]
	[ "$(cat "${log}")" = 'npm run test:ci -- --testNamePattern=synthetic' ]
}

@test "every CI suite job checks its own floor after running its tests" {
	run python3 - "${BATS_TEST_DIRNAME}/../../.github/workflows/ci.yml" <<'PY'
from pathlib import Path
import sys, yaml
jobs = yaml.safe_load(Path(sys.argv[1]).read_text())['jobs']
for job, suite, runner in [('safety-file', 'safety-file', 'python -m pytest safety_file -q'), ('tests', 'django', 'docker compose exec -T web pytest -v'), ('frontend', 'vitest', 'npm run test:ci'), ('scripts', 'bats', 'bats s/tests')]:
    steps = jobs[job]['steps']
    run = next(i for i, step in enumerate(steps) if step.get('run') == runner)
    floor = next(i for i, step in enumerate(steps) if step.get('run') == f'bash s/floors/tests {suite}')
    assert run < floor
PY
	[ "$status" -eq 0 ]
}
