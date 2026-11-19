#!/usr/bin/env bats
# Installer tests use copied scripts and fresh repositories. They never change
# this checkout's hooks, global Git configuration or another agent's worktree.
bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	mkdir -p "${repo}/s" "${repo}/.githooks"
	cp "${BATS_TEST_DIRNAME}/../install-hooks" "${repo}/s/install-hooks"
	cp "${BATS_TEST_DIRNAME}/../../.githooks/pre-commit" "${repo}/.githooks/pre-commit"
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	git -C "${repo}" init -q
}

@test "explicit installation selects the worktree-relative tracked hooks" {
	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --local --get core.hooksPath)" = ".githooks" ]
}

@test "repeated installation preserves the same local setting" {
	"${repo}/s/install-hooks"
	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --local --get core.hooksPath)" = ".githooks" ]
}

@test "help does not opt into hooks" {
	run "${repo}/s/install-hooks" --help

	[ "$status" -eq 0 ]
	[[ "$output" == *"Usage:"* ]]
	run git -C "${repo}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}

@test "unknown arguments do not change configuration" {
	run "${repo}/s/install-hooks" --unknown

	[ "$status" -eq 2 ]
	run git -C "${repo}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}

@test "a custom hooks path is retained rather than replaced" {
	git -C "${repo}" config --local core.hooksPath custom-hooks

	run "${repo}/s/install-hooks"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No configuration changed"* ]]
	[ "$(git -C "${repo}" config --local --get core.hooksPath)" = "custom-hooks" ]
}

@test "calling from another repository changes only the installer's checkout" {
	local other="${BATS_TEST_TMPDIR}/other"
	git init -q "${other}"
	git -C "${other}" config --local core.hooksPath other-hooks
	cd "${other}" || return 1

	run "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --local --get core.hooksPath)" = ".githooks" ]
	[ "$(git -C "${other}" config --local --get core.hooksPath)" = "other-hooks" ]
}

@test "inherited Git directory variables cannot redirect installation" {
	local other="${BATS_TEST_TMPDIR}/other"
	git init -q "${other}"

	run env GIT_DIR="${other}/.git" GIT_WORK_TREE="${repo}" GIT_COMMON_DIR="${other}/.git" "${repo}/s/install-hooks"

	[ "$status" -eq 0 ]
	[ "$(git -C "${repo}" config --local --get core.hooksPath)" = ".githooks" ]
	run git -C "${other}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}

@test "a missing tracked hook prevents installation" {
	rm "${repo}/.githooks/pre-commit"

	run "${repo}/s/install-hooks"

	[ "$status" -eq 1 ]
	run git -C "${repo}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}

@test "a copied installer inside a different repository cannot configure its parent" {
	local nested="${repo}/nested"
	mkdir -p "${nested}/s" "${nested}/.githooks"
	cp "${repo}/s/install-hooks" "${nested}/s/install-hooks"
	cp "${repo}/.githooks/pre-commit" "${nested}/.githooks/pre-commit"

	run "${nested}/s/install-hooks"

	[ "$status" -eq 1 ]
	[[ "$output" == *"root of its own Git checkout"* ]]
	run git -C "${repo}" config --local --get core.hooksPath
	[ "$status" -eq 1 ]
}
