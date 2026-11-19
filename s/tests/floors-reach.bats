#!/usr/bin/env bats
# Tests for s/floors/reach, which fails when a pre-commit hook is not given a
# file it should check. Each test runs a copy of the script in a scratch git
# repository, with the files each hook receives read from a JSON file
# instead of asked of pre-commit. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	received="${BATS_TEST_TMPDIR}/received.json"

	unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR GIT_INDEX_FILE
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	mkdir -p "${repo}/s/floors" "${repo}/s/tests" "${repo}/app/tests" "${repo}/safety_file" "${repo}/.github/workflows" "${repo}/frontend/tests" "${repo}/terraform/github"
	git -C "${repo}" init -q
	git -C "${repo}" config commit.gpgsign false

	# One tracked file of each kind a rule covers.
	printf '#!/usr/bin/env bash\necho up\n' >"${repo}/s/up"
	chmod +x "${repo}/s/up"
	echo "@test x { true; }" >"${repo}/s/tests/up.bats"
	echo "x = 1" >"${repo}/app/models.py"
	echo "x = 1" >"${repo}/app/tests/test_models.py"
	echo "x = 1" >"${repo}/safety_file/team.py"
	cp "${BATS_TEST_DIRNAME}/../../.github/workflows/ci.yml" "${repo}/.github/workflows/ci.yml"
	cp "${BATS_TEST_DIRNAME}/../../frontend/package.json" "${repo}/frontend/package.json"
	echo '// Synthetic routing fixture, not executed tooling tests.' >"${repo}/frontend/tests/tooling.test.mjs"
	echo 'terraform {}' >"${repo}/terraform/github/main.tf"
	echo "version: 2" >"${repo}/.github/dependabot.yml"
	echo "{}" >"${repo}/package.json"
	echo "{}" >"${repo}/frontend/tsconfig.json"
	echo "[tool]" >"${repo}/pyproject.toml"
	echo "# Readme" >"${repo}/README.md"
	echo "a {}" >"${repo}/frontend/app.css"
	echo "<svg/>" >"${repo}/logo.svg"
	printf '\0\1' >"${repo}/icon.png"

	git -C "${repo}" add -A

	# Copied in after the files are tracked, so the script is not one of
	# the files it checks.
	cp "${BATS_TEST_DIRNAME}/../floors/reach" "${BATS_TEST_DIRNAME}/../floors/reach.py" "${repo}/s/floors/"
}

# Write what each hook receives as JSON: what every rule wants, from a
# correct config, so each test takes away only the file it is about.
write_received() {
	cat >"${received}" <<'EOF'
{
	"trailing-whitespace": ["s/up", "s/tests/up.bats", "app/models.py", "app/tests/test_models.py", "safety_file/team.py", ".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "pyproject.toml", "README.md", "frontend/app.css"],
	"end-of-file-fixer": ["s/up", "s/tests/up.bats", "app/models.py", "app/tests/test_models.py", "safety_file/team.py", ".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "pyproject.toml", "README.md", "frontend/app.css"],
	"check-merge-conflict": ["s/up", "s/tests/up.bats", "app/models.py", "app/tests/test_models.py", "safety_file/team.py", ".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "pyproject.toml", "README.md", "frontend/app.css", "logo.svg"],
	"check-added-large-files": ["s/up", "s/tests/up.bats", "app/models.py", "app/tests/test_models.py", "safety_file/team.py", ".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "pyproject.toml", "README.md", "frontend/app.css", "logo.svg", "icon.png"],
	"check-dev-details": ["s/up", "s/tests/up.bats", "app/models.py", "app/tests/test_models.py", "safety_file/team.py", ".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "pyproject.toml", "README.md", "frontend/app.css", "logo.svg"],
	"check-yaml": [".github/workflows/ci.yml", ".github/dependabot.yml"],
	"check-json": ["package.json"],
	"check-toml": ["pyproject.toml"],
	"zizmor": [".github/workflows/ci.yml", ".github/dependabot.yml"],
	"mypy": ["safety_file/team.py"],
	"bandit": ["app/models.py", "safety_file/team.py"],
	"ruff-check": ["app/models.py", "app/tests/test_models.py", "safety_file/team.py"],
	"ruff-format": ["app/models.py", "app/tests/test_models.py", "safety_file/team.py"],
	"shellcheck": ["s/up", "s/tests/up.bats"],
	"actionlint": [".github/workflows/ci.yml"],
	"cspell": ["README.md"],
	"markdownlint": ["README.md"],
	"prettier": [".github/workflows/ci.yml", ".github/dependabot.yml", "package.json", "frontend/tsconfig.json", "README.md", "frontend/app.css"]
}
EOF
	python3 - "${received}" "${repo}" <<'PY'
from pathlib import Path
import json, subprocess, sys
path = Path(sys.argv[1])
data = json.loads(path.read_text())
extra = ['frontend/package.json', 'frontend/tests/tooling.test.mjs', 'terraform/github/main.tf']
for hook in ['trailing-whitespace', 'end-of-file-fixer', 'check-merge-conflict', 'check-added-large-files', 'check-dev-details']:
    data[hook] += extra
for hook in ['check-json', 'prettier']:
    data[hook].append('frontend/package.json')
data['terraform-fmt'] = ['terraform/github/main.tf']
data['gitleaks'] = subprocess.check_output(['git', '-C', sys.argv[2], 'ls-files', '-z']).decode().strip('\0').split('\0')
data['_metadata'] = {'gitleaks': {'pass_filenames': False, 'args': [], 'entry': 'gitleaks git --pre-commit --redact --staged --verbose'}}
path.write_text(json.dumps(data))
PY
}

# Take one file away from what one hook receives.
withhold() {
	local hook_id="$1"
	local path="$2"

	python3 - "${received}" "${hook_id}" "${path}" <<'EOF'
import json, sys
received_file, hook_id, path = sys.argv[1:]
with open(received_file) as file:
    received = json.load(file)
received[hook_id].remove(path)
with open(received_file, "w") as file:
    json.dump(received, file)
EOF
}

# bandit is not given app/tests/test_models.py and check-json is not given
# frontend/tsconfig.json, so this also shows the two exclusions are allowed.
@test "passes when every hook is given what it should check" {
	write_received

	run bash "${repo}/s/floors/reach" --hook-files "${received}"

	[ "$status" -eq 0 ]
	[[ "$output" == *"Every hook is given what it should check"* ]]
}

@test "fails when bandit is not given an application file" {
	write_received
	withhold bandit app/models.py

	run bash "${repo}/s/floors/reach" --hook-files "${received}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"bandit: is not given app/models.py"* ]]
}

@test "fails when ShellCheck is not given a script without an extension" {
	write_received
	withhold shellcheck s/up

	run bash "${repo}/s/floors/reach" --hook-files "${received}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"shellcheck: is not given s/up"* ]]
}

@test "fails when actionlint is not given a workflow" {
	write_received
	withhold actionlint .github/workflows/ci.yml
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *"actionlint: is not given .github/workflows/ci.yml"* ]]
}

@test "fails when a whole hook is missing from the config" {
	write_received
	python3 -c "
import json, sys
received = json.load(open(sys.argv[1]))
del received['zizmor']
json.dump(received, open(sys.argv[1], 'w'))" "${received}"

	run bash "${repo}/s/floors/reach" --hook-files "${received}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"zizmor: no such hook"* ]]
}

@test "fails when a rule matches no tracked file at all" {
	write_received
	git -C "${repo}" rm -q --cached safety_file/team.py
	rm "${repo}/safety_file/team.py"

	run bash "${repo}/s/floors/reach" --hook-files "${received}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"mypy: no tracked file is every Python file in safety_file/"* ]]
}

@test "works when called from another folder" {
	write_received
	cd "${repo}/app" || return 1

	run bash ../s/floors/reach --hook-files "${received}"

	[ "$status" -eq 0 ]
}

@test "Terraform formatting has an explicit file policy" {
	write_received
	withhold terraform-fmt terraform/github/main.tf
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'terraform-fmt: is not given terraform/github/main.tf'* ]]
}

@test "filename-free Gitleaks requires every trigger candidate and its native staged policy" {
	write_received
	withhold gitleaks app/models.py
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'gitleaks: is not given app/models.py'* ]]
	write_received
	python3 - "${received}" <<'PY'
from pathlib import Path
import json, sys
path = Path(sys.argv[1]); data = json.loads(path.read_text())
data['_metadata']['gitleaks']['pass_filenames'] = True
path.write_text(json.dumps(data))
PY
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'native filename-free staged-scan policy'* ]]
}

@test "new configured hooks cannot silently lack a reach policy" {
	write_received
	python3 - "${received}" <<'PY'
from pathlib import Path
import json, sys
path = Path(sys.argv[1]); data = json.loads(path.read_text()); data['unreviewed'] = []
path.write_text(json.dumps(data))
PY
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'unreviewed: no explicit reach policy'* ]]
}

@test "duplicate and malformed inventories cannot substitute for routing evidence" {
	write_received
	python3 - "${received}" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1]); content = path.read_text(); path.write_text('{"mypy": [],' + content[1:])
PY
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'no coverage is claimed'* ]]
	echo '{"mypy": "not-a-file-list"}' >"${received}"
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
}

@test "a missing tracked file is a failed inspection rather than silently absent" {
	write_received
	rm "${repo}/app/models.py"
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'no coverage is claimed'* ]]
}

@test "frontend project typechecking is a separate required surface" {
	write_received
	python3 - "${repo}/frontend/package.json" <<'PY'
from pathlib import Path
import json, sys
path = Path(sys.argv[1]); data = json.loads(path.read_text()); data['scripts']['typecheck'] = 'tsc --noEmit'
path.write_text(json.dumps(data))
PY
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'frontend: typecheck differs'* ]]
}

@test "removing a frontend CI gate is not mistaken for root-hook coverage" {
	write_received
	python3 - "${repo}/.github/workflows/ci.yml" <<'PY'
from pathlib import Path
import sys, yaml
path = Path(sys.argv[1]); data = yaml.safe_load(path.read_text())
data['jobs']['frontend']['steps'] = [step for step in data['jobs']['frontend']['steps'] if step.get('run') != 'npm run typecheck']
path.write_text(yaml.safe_dump(data))
PY
	run bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 1 ]
	[[ "$output" == *'frontend: CI no longer calls typecheck'* ]]
}

@test "inherited Git routing cannot replace this checkout's tracked inventory" {
	write_received
	local other="${BATS_TEST_TMPDIR}/other"
	git init -q "${other}"
	run env GIT_DIR="${other}/.git" GIT_WORK_TREE="${other}" GIT_COMMON_DIR="${other}/.git" GIT_INDEX_FILE="${other}/.git/index" bash "${repo}/s/floors/reach" --hook-files "${received}"
	[ "$status" -eq 0 ]
}
