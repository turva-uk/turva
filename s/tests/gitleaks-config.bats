#!/usr/bin/env bats
# Tests that .gitleaks.toml still tells gitleaks to scan with its built-in
# rules. A gitleaks config replaces those rules unless it extends them, and
# with no rules every scan passes, silently. These tests read the file and
# fail when the block that keeps the rules is gone or switched off. Run with:
# bats s/tests

setup() {
	config="${BATS_TEST_DIRNAME}/../../.gitleaks.toml"
}

# Print the lines of one TOML table, from its header to the next header.
table() {
	local name="$1"
	local file="$2"

	awk -v header="[${name}]" '
		$0 == header { inside = 1; next }
		/^\[/ { inside = 0 }
		inside { print }
	' "${file}"
}

@test "the config extends the built-in rules" {
	run table extend "${config}"

	[ "$status" -eq 0 ]
	[[ "$output" =~ (^|$'\n')useDefault[[:space:]]*=[[:space:]]*true($|$'\n') ]]
}

@test "a config with the block commented out is caught" {
	local broken="${BATS_TEST_TMPDIR}/broken.toml"

	sed 's/^useDefault = true$/# useDefault = true/' "${config}" >"${broken}"

	run table extend "${broken}"

	[[ ! "$output" =~ (^|$'\n')useDefault[[:space:]]*=[[:space:]]*true($|$'\n') ]]
}

@test "a config with no extend block is caught" {
	local broken="${BATS_TEST_TMPDIR}/broken.toml"

	cat >"${broken}" <<'EOF'
title = "t"

[allowlist]
paths = []
EOF

	run table extend "${broken}"

	[ -z "$output" ]
}

@test "no allowlist entry lets a whole folder of source through" {
	run grep -nE "^\s*'''(\^)?(app|demo|docs|frontend|s|safety_file|terraform)(/)?(\\$)?'''" "${config}"

	[ "$status" -eq 1 ]
}
