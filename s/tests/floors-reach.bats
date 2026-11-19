#!/usr/bin/env bats
# Tests for s/floors/reach, which fails when a pre-commit hook is not given a
# file it should check. Each test runs a copy of the script in a scratch git
# repository, with the files each hook receives read from a JSON file
# instead of asked of pre-commit. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	received="${BATS_TEST_TMPDIR}/received.json"

	mkdir -p "${repo}/s/floors" "${repo}/s/tests" "${repo}/app/tests" "${repo}/safety_file" "${repo}/.github/workflows" "${repo}/frontend"
	git -C "${repo}" init -q

	# One tracked file of each kind a rule covers.
	printf '#!/usr/bin/env bash\necho up\n' >"${repo}/s/up"
	chmod +x "${repo}/s/up"
	echo "@test x { true; }" >"${repo}/s/tests/up.bats"
	echo "x = 1" >"${repo}/app/models.py"
	echo "x = 1" >"${repo}/app/tests/test_models.py"
	echo "x = 1" >"${repo}/safety_file/team.py"
	echo "on: push" >"${repo}/.github/workflows/ci.yml"
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
