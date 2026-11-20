#!/usr/bin/env bats
# Copied entry-point tests with synthetic tools: no scanner or installer runs.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	mkdir -p "${repo}/s/checks" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../checks/actionlint" "${repo}/s/checks/actionlint"
	cat >"${bin}/actionlint" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$PWD" "$@" >"${BATS_TEST_TMPDIR}/calls"
exit "${SCANNER_STATUS:-0}"
EOF
	printf '#!/usr/bin/env bash\nexit 0\n' >"${bin}/shellcheck"
	chmod +x "${bin}/"{actionlint,shellcheck}
	export PATH="${bin}:${PATH}"
}

@test "explicitly supplies the isolated ShellCheck path and literal filenames" {
	run "${repo}/s/checks/actionlint" '.github/workflows/with space.yml'
	[ "$status" -eq 0 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/calls")" = "${repo}
-shellcheck=${bin}/shellcheck
--
.github/workflows/with space.yml" ]
}

@test "missing ShellCheck cannot look like a clean actionlint result" {
	local bare="${BATS_TEST_TMPDIR}/bare"
	mkdir "${bare}"
	ln -s "$(command -v bash)" "${bare}/bash"
	ln -s "$(command -v dirname)" "${bare}/dirname"
	ln -s "${bin}/actionlint" "${bare}/actionlint"
	run env PATH="${bare}" bash "${repo}/s/checks/actionlint" .github/workflows/ci.yml
	[ "$status" -eq 1 ]
	[[ "$output" == *'ShellCheck is missing'* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}

@test "missing actionlint gives a hint without installing packages" {
	local bare="${BATS_TEST_TMPDIR}/bare"
	mkdir "${bare}"
	ln -s "$(command -v bash)" "${bare}/bash"
	ln -s "$(command -v dirname)" "${bare}/dirname"
	ln -s "${bin}/shellcheck" "${bare}/shellcheck"
	run env PATH="${bare}" bash "${repo}/s/checks/actionlint" .github/workflows/ci.yml
	[ "$status" -eq 1 ]
	[[ "$output" == *'no packages were installed'* ]]
}

@test "scanner findings and tool errors retain their failing status" {
	local status_code
	for status_code in 1 2 3; do
		run env SCANNER_STATUS="${status_code}" "${repo}/s/checks/actionlint" .github/workflows/ci.yml
		[ "$status" -eq "${status_code}" ]
	done
}

@test "an absent scope and policy-lowering flags stop before a scan" {
	run "${repo}/s/checks/actionlint"
	[ "$status" -eq 1 ]
	run "${repo}/s/checks/actionlint" -shellcheck= .github/workflows/ci.yml
	[ "$status" -eq 1 ]
	[ ! -e "${BATS_TEST_TMPDIR}/calls" ]
}

@test "direct invocation uses its containing checkout" {
	cd "${BATS_TEST_TMPDIR}" || return 1
	run "${repo}/s/checks/actionlint" .github/workflows/ci.yml
	[ "$status" -eq 0 ]
	[ "$(head -n 1 "${BATS_TEST_TMPDIR}/calls")" = "${repo}" ]
}

@test "the hook declares the same ShellCheck release as the standalone hook" {
	run python3 - "${BATS_TEST_DIRNAME}/../../.pre-commit-config.yaml" <<'PY'
from pathlib import Path
import sys, yaml
config = yaml.safe_load(Path(sys.argv[1]).read_text())
records = {hook['id']: (repo, hook) for repo in config['repos'] for hook in repo['hooks']}
version = records['shellcheck'][0]['rev'].removeprefix('v')
hook = records['actionlint'][1]
assert hook['additional_dependencies'] == [f'shellcheck-py=={version}']
assert hook['entry'] == 'bash s/checks/actionlint' and hook['args'] == []
assert hook.get('pass_filenames', True) is True
PY
	[ "$status" -eq 0 ]
}
