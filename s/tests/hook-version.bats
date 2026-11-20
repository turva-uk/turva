#!/usr/bin/env bats
# Tests for s/checks/hook-version, which prints the version a hook
# repository is pinned to in .pre-commit-config.yaml. Each test runs a copy
# of the script beside a made-up config. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"

	mkdir -p "${repo}/s/checks" "${repo}/s/utils" "${repo}/.github/workflows"
	cp "${BATS_TEST_DIRNAME}/../checks/hook-version" "${repo}/s/checks/hook-version"
	cp "${BATS_TEST_DIRNAME}/../utils/hook-version.py" "${repo}/s/utils/hook-version.py"
	cp "${BATS_TEST_DIRNAME}/../../.github/workflows/workflow-security.yml" "${repo}/.github/workflows/workflow-security.yml"
	cp "${BATS_TEST_DIRNAME}/../../.github/workflows/ci.yml" "${repo}/.github/workflows/ci.yml"

	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks

  - repo: https://github.com/zizmorcore/zizmor-pre-commit
    rev: v1.30.1
    hooks:
      - id: zizmor

  - repo: local
    hooks:
      - id: check-dev-details
EOF
}

@test "prints the rev of the named repository without its v" {
	run bash "${repo}/s/checks/hook-version" https://github.com/zizmorcore/zizmor-pre-commit

	[ "$status" -eq 0 ]
	[ "$output" = "1.30.1" ]
}

@test "does not take the rev of the repository above it" {
	run bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks

	[ "$status" -eq 0 ]
	[ "$output" = "8.30.1" ]
}

@test "does not match a repository whose URL only starts the same" {
	run bash "${repo}/s/checks/hook-version" https://github.com/zizmorcore/zizmor

	[ "$status" -eq 1 ]
}

@test "fails for a repository with no rev" {
	run bash "${repo}/s/checks/hook-version" local

	[ "$status" -eq 1 ]
}

@test "fails without a repository" {
	run bash "${repo}/s/checks/hook-version"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No repository given"* ]]
}

@test "quoted repository and release scalars with comments are decoded as YAML" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: 'https://github.com/zizmorcore/zizmor-pre-commit' # actual identity
    rev: "v1.30.1" # release note
EOF
	run bash "${repo}/s/checks/hook-version" https://github.com/zizmorcore/zizmor-pre-commit
	[ "$status" -eq 0 ]
	[ "$output" = 1.30.1 ]
}

@test "a flow-style manifest and a release without v are accepted" {
	echo '{repos: [{repo: https://github.com/gitleaks/gitleaks, rev: "8.30.1"}]}' >"${repo}/.pre-commit-config.yaml"
	run bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 0 ]
	[ "$output" = 8.30.1 ]
}

@test "duplicate keys anywhere in the manifest are rejected without a version" {
	local duplicate
	for duplicate in 'rev: v8.30.2' 'repo: https://github.com/gitleaks/gitleaks'; do
		printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.30.1\n    %s\n' "${duplicate}" >"${repo}/.pre-commit-config.yaml"
		run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
	printf 'repos: [{repo: https://github.com/gitleaks/gitleaks, rev: v8.30.1, hooks: [{id: a, id: b}]}]\n' >"${repo}/.pre-commit-config.yaml"
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "a repository found only in a comment does not select a pin" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: local
    # repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
EOF
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "duplicate repository records are ambiguous even if their versions agree" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
EOF
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "a missing pin cannot borrow a later repository's revision" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    hooks: []
  - repo: elsewhere
    rev: v8.30.1
EOF
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "non-release and non-scalar revisions never appear on stdout" {
	local value
	for value in null true 123 '[v8.30.1]' '{value: v8.30.1}' 'not-a-version' 'v8.30' 'v08.30.1' 'v8.30.1 extra' '"v8.30.1\nINJECTED=value"' 'v8.30.1-rc1'; do
		printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: %s\n' "${value}" >"${repo}/.pre-commit-config.yaml"
		run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
		[[ "$stderr" != *INJECTED* ]]
	done
}

@test "block and physically multiline revision scalars are refused" {
	local value
	for value in '|-' '>-'; do
		printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: %s\n      v8.30.1\n' "${value}" >"${repo}/.pre-commit-config.yaml"
		run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
	printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: "v8.30.\\\n      1"\n' >"${repo}/.pre-commit-config.yaml"
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "malformed manifests and unsafe YAML tags are refused without execution" {
	local value
	for value in '' 'repos: [broken' '[]' 'repos: {}' 'repos: [null]' 'repos: [{repo: null, rev: v8.30.1}]' 'repos: !!python/object/apply:os.system ["touch executed"]'; do
		printf '%s\n' "${value}" >"${repo}/.pre-commit-config.yaml"
		run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
		[ ! -e executed ]
	done
}

@test "aliases and merged mapping keys are refused rather than resolved ambiguously" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
defaults: &defaults {rev: v8.30.1}
repos:
  - repo: https://github.com/gitleaks/gitleaks
    <<: *defaults
EOF
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "missing and oversized input files fail without a partial version" {
	rm "${repo}/.pre-commit-config.yaml"
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
	python3 - "${repo}/.pre-commit-config.yaml" <<'PY'
from pathlib import Path
import sys
Path(sys.argv[1]).write_text("#" * 1_048_577)
PY
	run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
}

@test "deep and node-heavy YAML stops at finite structural limits" {
	local mode
	for mode in deep wide; do
		python3 - "${repo}/.pre-commit-config.yaml" "${mode}" <<'PY'
from pathlib import Path
import sys
value = "[" * 100 + "0" + "]" * 100 if sys.argv[2] == "deep" else "[" + "0," * 20_001 + "]"
Path(sys.argv[1]).write_text("extra: " + value + "\nrepos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.30.1\n")
PY
		run --separate-stderr bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
		[ "$status" -eq 1 ]
		[ -z "${output}" ]
	done
}

@test "a missing parser dependency gives an explicit hint without installing packages" {
	local python bin="${BATS_TEST_TMPDIR}/bin"
	python=$(command -v python3)
	mkdir "${bin}"
	printf '#!/usr/bin/env bash\nexec "%s" -S "$@"\n' "${python}" >"${bin}/python3"
	chmod +x "${bin}/python3"
	run --separate-stderr env PATH="${bin}:${PATH}" bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 1 ]
	[ -z "${output}" ]
	[[ "$stderr" == *"PyYAML is required"* ]]
	[[ "$stderr" == *"no packages were installed"* ]]
}

@test "the workflow fails before writing GITHUB_OUTPUT when pin extraction fails" {
	local command output_file="${BATS_TEST_TMPDIR}/github-output"
	command=$(python3 - "${repo}/.github/workflows/workflow-security.yml" <<'PY'
from pathlib import Path
import sys, yaml
workflow = yaml.safe_load(Path(sys.argv[1]).read_text())
print(next(step['run'] for step in workflow['jobs']['workflow-security']['steps'] if step.get('id') == 'zizmor'))
PY
	)
	echo 'repos: []' >"${repo}/.pre-commit-config.yaml"
	echo retained >"${output_file}"
	cd "${repo}" || return 1
	run env GITHUB_OUTPUT="${output_file}" bash -e -o pipefail -c "${command}"
	[ "$status" -ne 0 ]
	[ "$(cat "${output_file}")" = retained ]
}

@test "successful workflow extraction writes exactly one validated output line" {
	local command output_file="${BATS_TEST_TMPDIR}/github-output"
	command=$(python3 - "${repo}/.github/workflows/workflow-security.yml" <<'PY'
from pathlib import Path
import sys, yaml
workflow = yaml.safe_load(Path(sys.argv[1]).read_text())
print(next(step['run'] for step in workflow['jobs']['workflow-security']['steps'] if step.get('id') == 'zizmor'))
PY
	)
	cd "${repo}" || return 1
	run env GITHUB_OUTPUT="${output_file}" bash -e -o pipefail -c "${command}"
	[ "$status" -eq 0 ]
	[ "$(cat "${output_file}")" = version=1.30.1 ]
	[ "$(wc -l <"${output_file}")" -eq 1 ]
}

@test "every pin-consuming CI job explicitly installs its existing locked parser first" {
	run python3 - "${repo}/.github/workflows" <<'PY'
from pathlib import Path
import sys, yaml
root = Path(sys.argv[1])
for filename, job, consumer in [
    ('ci.yml', 'secrets', 'bash s/gitleaks/install'),
    ('ci.yml', 'scripts', 'bats s/tests'),
    ('workflow-security.yml', 'workflow-security', 's/checks/hook-version'),
]:
    steps = yaml.safe_load((root / filename).read_text())['jobs'][job]['steps']
    python = next(i for i, step in enumerate(steps) if step.get('uses', '').startswith('actions/setup-python@'))
    install = next(i for i, step in enumerate(steps) if 'pip install --only-binary=:all: -c app/requirements.txt PyYAML' in step.get('run', ''))
    use = next(i for i, step in enumerate(steps) if consumer in step.get('run', ''))
    assert python < install < use, (filename, job)
PY
	[ "$status" -eq 0 ]
}

@test "the reader prefers its own virtual environment and works from another folder" {
	local python elsewhere="${BATS_TEST_TMPDIR}/elsewhere"
	python=$(command -v python3)
	mkdir -p "${repo}/.venv/bin" "${elsewhere}"
	cat >"${repo}/.venv/bin/python" <<EOF
#!/usr/bin/env bash
echo selected >"\${BATS_TEST_TMPDIR}/python-selection"
exec "${python}" "\$@"
EOF
	chmod +x "${repo}/.venv/bin/python"
	cd "${elsewhere}" || return 1
	run bash "${repo}/s/checks/hook-version" https://github.com/gitleaks/gitleaks
	[ "$status" -eq 0 ]
	[ "$output" = 8.30.1 ]
	[ "$(cat "${BATS_TEST_TMPDIR}/python-selection")" = selected ]
}
