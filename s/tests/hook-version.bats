#!/usr/bin/env bats
# Tests for s/checks/hook-version, which prints the version a hook
# repository is pinned to in .pre-commit-config.yaml. Each test runs a copy
# of the script beside a made-up config. Run with: bats s/tests

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"

	mkdir -p "${repo}/s/checks"
	cp "${BATS_TEST_DIRNAME}/../checks/hook-version" "${repo}/s/checks/hook-version"

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
	[[ "$output" == *"pins no rev for https://github.com/zizmorcore/zizmor"* ]]
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
