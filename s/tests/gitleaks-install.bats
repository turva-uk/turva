#!/usr/bin/env bats
# Tests for s/gitleaks/install. Each test runs a copy of the script in a
# scratch folder, with a stand-in for curl that serves a fake release, so
# nothing reaches GitHub. Run with: bats s/tests

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	release="${BATS_TEST_TMPDIR}/release"
	target="${BATS_TEST_TMPDIR}/installed"

	mkdir -p "${repo}/s/gitleaks" "${bin}" "${release}/build"
	cp "${BATS_TEST_DIRNAME}/../gitleaks/install" "${repo}/s/gitleaks/install"

	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
EOF

	make_release "8.30.1"

	# curl records each URL, and writes the release file it names into the
	# path given after -o.
	cat >"${bin}/curl" <<'EOF'
#!/usr/bin/env bash
output=""
url=""
while [ "$#" -gt 0 ]; do
	case "$1" in
		-o) output="$2"; shift 2 ;;
		http*) url="$1"; shift ;;
		*) shift ;;
	esac
done
echo "${url}" >>"${BATS_TEST_TMPDIR}/curl.log"
cp "${BATS_TEST_TMPDIR}/release/$(basename "${url}")" "${output}"
EOF

	chmod +x "${bin}/curl"
	export PATH="${bin}:${PATH}"
}

# Build a fake gitleaks release: an archive holding a script named gitleaks,
# and a checksums file that matches it.
make_release() {
	local version="$1"
	local archive="gitleaks_${version}_linux_x64.tar.gz"

	cat >"${release}/build/gitleaks" <<'EOF'
#!/usr/bin/env bash
echo "fake gitleaks"
EOF

	chmod +x "${release}/build/gitleaks"
	tar -czf "${release}/${archive}" -C "${release}/build" gitleaks
	(cd "${release}" && sha256sum "${archive}" >"gitleaks_${version}_checksums.txt")
}

@test "installs the version the pre-commit hook pins" {
	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -eq 0 ]
	[ "$("${target}/gitleaks")" = "fake gitleaks" ]
	grep -q "download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz" "${BATS_TEST_TMPDIR}/curl.log"
}

@test "refuses a download that does not match its checksum" {
	echo "tampered" >>"${release}/gitleaks_8.30.1_linux_x64.tar.gz"

	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"does not match gitleaks' published checksum"* ]]
	[ ! -e "${target}/gitleaks" ]
}

@test "fails when the pre-commit config pins no gitleaks" {
	echo "repos: []" >"${repo}/.pre-commit-config.yaml"

	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -eq 1 ]
	[[ "$output" == *"Could not read the gitleaks rev"* ]]
}

@test "fails without a folder to install into" {
	run bash "${repo}/s/gitleaks/install"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No folder given"* ]]
}
