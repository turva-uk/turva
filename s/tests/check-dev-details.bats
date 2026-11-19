#!/usr/bin/env bats
# Tests for s/checks/check-dev-details, which refuses private addresses, MAC
# addresses and other details of a home or dev set-up in tracked files.
#
# Each test builds a scratch repository and runs the check inside it, so the
# private files used as fixtures stay there and the real clone is never touched. Every
# address below is made up, and this file is exempt from the check because
# its name ends .bats. Run with: bats s/tests

# Bats isolates each test's script path, including the linked-tree fixture.
# shellcheck disable=SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	script="${repo}/s/checks/check-dev-details"
	unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR GIT_INDEX_FILE
	export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
	mkdir -p "${repo}/s/checks" "${repo}/s/utils"
	cp "${BATS_TEST_DIRNAME}/../checks/check-dev-details" "${script}"
	cp "${BATS_TEST_DIRNAME}/../utils/dev-details.py" "${repo}/s/utils/dev-details.py"
	cp "${BATS_TEST_DIRNAME}/../../.gitignore" "${repo}/.gitignore"

	git init -q "${repo}"
	git -C "${repo}" config commit.gpgsign false
	git -C "${repo}" add s .gitignore
	git -C "${repo}" -c user.name=t -c user.email=t@example.com commit -q -m "start"

	denylist="$(cd -P "${repo}" && pwd)/.private/dev-details-denylist"

	cd "${repo}" || return 1
}

# Run the check as it runs on a developer's machine.
check() {
	run env -u CI "${script}" "$@"
}

# Run the check as it runs in CI.
check_in_ci() {
	run env CI=true "${script}" "$@"
}

@test "a clean file passes" {
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
}

@test "a home network address in a document fails" {
	printf 'one\nreach it at 192.168.1.20.\n' >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"notes.md:2: dev detail (private address)"* ]]
}

@test "a VPN host address fails" {
	echo "the phone loads http://100.101.102.103" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"(private address)"* ]]
}

@test "the same address in a test file passes" {
	echo 'CLIENT = "192.168.1.20"' >test_client.py

	check test_client.py

	[ "$status" -eq 0 ]
}

@test "a CIDR passes" {
	echo 'subnet = "10.0.0.0/20"' >network.tf

	check network.tf

	[ "$status" -eq 0 ]
}

@test "a network address ending .0 passes" {
	echo 'address = "10.8.0.0"' >network.tf

	check network.tf

	[ "$status" -eq 0 ]
}

@test "a public address passes" {
	echo "the load balancer is on 100.200.1.2" >notes.md

	check notes.md

	[ "$status" -eq 0 ]
}

@test "a version number passes" {
	echo '"storybook": "10.6.2"' >package.json

	check package.json

	[ "$status" -eq 0 ]
}

@test "a MAC address fails" {
	echo "the box is aa:bb:cc:dd:ee:0f on the router" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"(MAC address)"* ]]
}

@test "a longer fingerprint passes" {
	echo "fingerprint AB:CD:EF:01:23:45:67:89" >notes.md

	check notes.md

	[ "$status" -eq 0 ]
}

@test "the output names the file and line but not the text" {
	echo "reach it at 192.168.1.20" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" != *"192.168.1.20"* ]]
}

@test "a literal from the denylist fails, whatever its case" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-laptop" >"${denylist}"
	echo "banners go to Example-Laptop" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"notes.md:1: dev detail (a supplied personal literal)"* ]]
	[[ "$output" != *"Example-Laptop"* ]]
}

@test "a VPN network's name from the denylist fails" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-vpn.example.net" >"${denylist}"
	echo "open devbox.example-vpn.example.net in the browser" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"(a supplied personal literal)"* ]]
}

@test "the denylist's comments are not literals" {
	mkdir -p "$(dirname "${denylist}")"
	printf '# A heading\n\n' >"${denylist}"
	echo "# A heading" >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	[ "$(cat "${denylist}")" = '# A heading' ]
}

@test "a scan never creates a personal list or directory" {
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	[ ! -e "${repo}/.private" ]
	[ ! -e "${repo}/local" ]
}

@test "the adopted private directory is ignored without editing shared Git exclusions" {
	local before
	before=$(cat "${repo}/.git/info/exclude")
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	git check-ignore -q .private/dev-details-denylist
	[ "$(cat "${repo}/.git/info/exclude")" = "${before}" ]
}

@test "a denylist that is there is left as it is" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-laptop" >"${denylist}"
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$(cat "${denylist}")" = "example-laptop" ]
}

@test "a worktree uses only its own optional list without changing the main checkout" {
	local worktree="${BATS_TEST_TMPDIR}/worktree" before
	before=$(cat "${repo}/.git/info/exclude")
	mkdir -p "$(dirname "${denylist}")"
	echo "example-laptop" >"${denylist}"
	git worktree add -q "${worktree}"
	script="${worktree}/s/checks/check-dev-details"
	cd "${worktree}" || return 1
	echo "banners go to example-laptop" >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	[ ! -e "${worktree}/.private" ]
	[ ! -e "${worktree}/local" ]
	mkdir "${worktree}/.private"
	echo example-laptop >"${worktree}/.private/dev-details-denylist"
	check notes.md
	[ "$status" -eq 1 ]
	[ "$(cat "${denylist}")" = example-laptop ]
	[ "$(cat "${repo}/.git/info/exclude")" = "${before}" ]
}

@test "CI makes no denylist and checks the patterns" {
	echo "reach it at 192.168.1.20" >notes.md

	check_in_ci notes.md

	[ "$status" -eq 1 ]
	[ ! -e "$(dirname "${denylist}")" ]
}

@test "obsolete warning mode is rejected without creating personal state" {
	check --warn-if-empty

	[ "$status" -eq 2 ]
	[ ! -e "${repo}/.private" ]
	[ ! -e "${repo}/local" ]
}

@test "a missing or comment-only optional list never nags" {
	echo "Nothing to see here." >notes.md
	check notes.md
	[ "$status" -eq 0 ]
	[ "${output}" = 'Checked 1 file for dev details' ]
	mkdir -p "$(dirname "${denylist}")"
	printf '# Comment only\n\n' >"${denylist}"
	check notes.md
	[ "$status" -eq 0 ]
	[ "${output}" = 'Checked 1 file for dev details' ]
}

@test "an optional list is not read implicitly in CI" {
	mkdir -p "$(dirname "${denylist}")"
	printf '# A comment\nexample-laptop\n' >"${denylist}"
	echo example-laptop >notes.md
	check_in_ci notes.md

	[ "$status" -eq 0 ]
	[ "$output" = 'Checked 1 file for dev details' ]
}

@test "an explicit optional list is honoured without modification even in CI" {
	mkdir -p "$(dirname "${denylist}")"
	echo example-laptop >"${denylist}"
	echo Example-Laptop >notes.md
	check_in_ci --denylist "${denylist}" notes.md

	[ "$status" -eq 1 ]
	[[ "$output" != *"Example-Laptop"* ]]
	[ "$(cat "${denylist}")" = example-laptop ]
}

@test "--all checks every tracked file" {
	echo "reach it at 192.168.1.20" >tracked.md
	echo "reach it at 192.168.1.20" >untracked.md
	git add tracked.md

	check --all

	[ "$status" -eq 1 ]
	[[ "$output" == *"tracked.md:1:"* ]]
	[[ "$output" != *"untracked.md"* ]]
}

@test "no files is a pass" {
	check

	[ "$status" -eq 0 ]
	[[ "$output" == *"Checked 0 files for dev details"* ]]
}

@test "a clean run says how many files it checked" {
	echo "Nothing to see here." >one.md
	echo "Nor here." >two.md
	echo "reach it at 192.168.1.20" >fixture_test.py

	check one.md two.md fixture_test.py

	[ "$status" -eq 0 ]
	[[ "$output" == *"Checked 2 files for dev details"* ]]
}

@test "one file checked is counted as one file" {
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	[[ "$output" == *"Checked 1 file for dev details"* ]]
}

@test "personal literals are checked even in synthetic pattern fixtures" {
	mkdir -p "$(dirname "${denylist}")"
	echo example-laptop >"${denylist}"
	echo 'NAME = "Example-Laptop"' >test_fixture.py
	check test_fixture.py
	[ "$status" -eq 1 ]
	[[ "$output" == *"a supplied personal literal"* ]]
	[[ "$output" != *"Example-Laptop"* ]]
}

@test "a missing explicit file fails rather than reporting a clean scan" {
	check missing.md
	[ "$status" -eq 2 ]
	[[ "$output" == *"could not inspect text"* ]]
}

@test "a failed tracked-file query stops the scan" {
	local bin="${BATS_TEST_TMPDIR}/bin"
	mkdir "${bin}"
	printf '#!/usr/bin/env bash\nexit 128\n' >"${bin}/git"
	chmod +x "${bin}/git"
	run env CI=true PATH="${bin}:${PATH}" "${script}" --all
	[ "$status" -eq 2 ]
	[[ "$output" == *"Could not list tracked files"* ]]
}

@test "filenames with spaces or leading dashes remain data" {
	echo 'reach it at 192.168.1.20' >'two words.md'
	echo 'reach it at 192.168.1.20' >'--all'
	check -- 'two words.md' '--all'
	[ "$status" -eq 1 ]
	[[ "$output" == *"two words.md:1:"* ]]
	[[ "$output" == *"--all:1:"* ]]
	[[ "$output" != *"192.168.1.20"* ]]
}

@test "an invalid optional list fails without exposing its contents" {
	printf '\377synthetic-private-value' >invalid-list
	echo clean >notes.md
	check --denylist invalid-list notes.md
	[ "$status" -eq 2 ]
	[[ "$output" == *"Optional denylist could not be read"* ]]
	[[ "$output" != *"synthetic-private-value"* ]]
}

@test "a missing explicitly requested list is a configuration error" {
	echo clean >notes.md
	check --denylist missing-private-list notes.md
	[ "$status" -eq 2 ]
	[[ "$output" == *"Optional denylist could not be read"* ]]
	[ ! -e missing-private-list ]
}

@test "invalid text encoding fails without exposing the file contents" {
	printf '\377synthetic-private-value' >notes.md
	check notes.md
	[ "$status" -eq 2 ]
	[[ "$output" == *"could not inspect text"* ]]
	[[ "$output" != *"synthetic-private-value"* ]]
}

@test "inherited Git routing cannot hide this checkout's tracked findings" {
	local other="${BATS_TEST_TMPDIR}/other"
	git init -q "${other}"
	echo 'reach it at 192.168.1.20' >tracked.md
	git add tracked.md
	run env CI=true GIT_DIR="${other}/.git" GIT_WORK_TREE="${other}" GIT_COMMON_DIR="${other}/.git" GIT_INDEX_FILE="${other}/.git/index" "${script}" --all
	[ "$status" -eq 1 ]
	[[ "$output" == *"tracked.md:1:"* ]]
	[[ "$output" != *"192.168.1.20"* ]]
}
