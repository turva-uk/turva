#!/usr/bin/env bats
# Tests for s/checks/check-dev-details, which refuses private addresses, MAC
# addresses and other details of a home or dev set-up in tracked files.
#
# Each test builds a scratch repository and runs the check inside it, so the
# local/ folder it makes is there and the real one is never touched. Every
# address below is made up, and this file is exempt from the check because
# its name ends .bats. Run with: bats s/tests

setup() {
	script="${BATS_TEST_DIRNAME}/../checks/check-dev-details"
	repo="${BATS_TEST_TMPDIR}/repo"

	git init -q "${repo}"
	git -C "${repo}" -c user.name=t -c user.email=t@example.com commit -q --allow-empty -m "start"

	denylist="$(cd -P "${repo}" && pwd)/local/dev-details-denylist"

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
	[[ "$output" == *"notes.md:1: dev detail (a literal from local/dev-details-denylist)"* ]]
	[[ "$output" != *"Example-Laptop"* ]]
}

@test "a VPN network's name from the denylist fails" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-vpn.example.net" >"${denylist}"
	echo "open devbox.example-vpn.example.net in the browser" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[[ "$output" == *"(a literal from local/dev-details-denylist)"* ]]
}

@test "the denylist's comments are not literals" {
	echo "# A heading" >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	grep -qx '#' "${denylist}"
}

@test "the denylist is made with its header when it is missing" {
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	head -1 "${denylist}" | grep -q '^# Dev set-up details'
}

@test "the denylist is ignored by git through info/exclude" {
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$status" -eq 0 ]
	git check-ignore -q local/dev-details-denylist
}

@test "a denylist that is there is left as it is" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-laptop" >"${denylist}"
	echo "Nothing to see here." >notes.md

	check notes.md

	[ "$(cat "${denylist}")" = "example-laptop" ]
}

@test "a worktree reads the main checkout's denylist" {
	mkdir -p "$(dirname "${denylist}")"
	echo "example-laptop" >"${denylist}"
	git worktree add -q "${BATS_TEST_TMPDIR}/worktree"
	cd "${BATS_TEST_TMPDIR}/worktree"
	echo "banners go to example-laptop" >notes.md

	check notes.md

	[ "$status" -eq 1 ]
	[ ! -e "${BATS_TEST_TMPDIR}/worktree/local" ]
}

@test "CI makes no denylist and checks the patterns" {
	echo "reach it at 192.168.1.20" >notes.md

	check_in_ci notes.md

	[ "$status" -eq 1 ]
	[ ! -e "$(dirname "${denylist}")" ]
}

@test "--warn-if-empty recommends a denylist when there is none" {
	check --warn-if-empty

	[ "$status" -eq 0 ]
	[[ "$output" == *"Strongly recommended"* ]]
	[[ "$output" == *"${denylist}"* ]]
}

@test "--warn-if-empty recommends entries when the denylist holds only its header" {
	echo "Nothing to see here." >notes.md
	check notes.md
	head -1 "${denylist}" | grep -q '^# Dev set-up details'

	check --warn-if-empty

	[ "$status" -eq 0 ]
	[[ "$output" == *"Strongly recommended"* ]]
}

@test "--warn-if-empty is silent once the denylist has an entry" {
	mkdir -p "$(dirname "${denylist}")"
	printf '# A comment\nexample-laptop\n' >"${denylist}"

	check --warn-if-empty

	[ "$status" -eq 0 ]
	[ -z "$output" ]
}

@test "--warn-if-empty is silent in CI" {
	check_in_ci --warn-if-empty

	[ "$status" -eq 0 ]
	[ -z "$output" ]
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
