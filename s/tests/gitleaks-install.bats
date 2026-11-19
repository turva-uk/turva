#!/usr/bin/env bats
# Tests for s/gitleaks/install. Each test runs a copy of the script in a
# scratch folder, with a stand-in for curl that serves a fake release, so
# nothing reaches GitHub. Run with: bats s/tests

bats_require_minimum_version 1.5.0

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"
	release="${BATS_TEST_TMPDIR}/release"
	target="${BATS_TEST_TMPDIR}/installed"

	mkdir -p "${repo}/s/gitleaks" "${repo}/s/checks" "${repo}/s/utils" "${bin}" "${release}/build"
	cp "${BATS_TEST_DIRNAME}/../gitleaks/install" "${repo}/s/gitleaks/install"
	cp "${BATS_TEST_DIRNAME}/../checks/hook-version" "${repo}/s/checks/hook-version"
	cp "${BATS_TEST_DIRNAME}/../utils/hook-version.py" "${repo}/s/utils/hook-version.py"

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
echo "$*" >>"${BATS_TEST_TMPDIR}/curl-args.log"
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
if [ "${1:-}" = version ]; then
	echo 8.30.1
	exit 0
fi
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
	[[ "$output" == *"Could not read a unique release pin"* ]]
}

@test "fails without a folder to install into" {
	run bash "${repo}/s/gitleaks/install"

	[ "$status" -eq 1 ]
	[[ "$output" == *"No folder given"* ]]
}

@test "invalid, duplicate or misplaced pins stop before downloading" {
	local pin
	for pin in 'v8.30.1 extra' '../elsewhere' '"v8.30.1\nINJECTED=value"'; do
		printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: %s\n' "$pin" >"${repo}/.pre-commit-config.yaml"
		run bash "${repo}/s/gitleaks/install" "${target}"
		[ "$status" -ne 0 ]
		[ ! -e "${BATS_TEST_TMPDIR}/curl.log" ]
	done
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
EOF
	run bash "${repo}/s/gitleaks/install" "${target}"
	[ "$status" -ne 0 ]
	[ ! -e "${BATS_TEST_TMPDIR}/curl.log" ]
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    hooks: []
  - repo: elsewhere
    rev: v8.30.1
EOF
	run bash "${repo}/s/gitleaks/install" "${target}"
	[ "$status" -ne 0 ]
	[ ! -e "${BATS_TEST_TMPDIR}/curl.log" ]
}

@test "the installer decodes quoted pins and comments through the shared reader" {
	cat >"${repo}/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: "https://github.com/gitleaks/gitleaks"
    rev: 'v8.30.1' # same reviewed release
EOF
	run bash "${repo}/s/gitleaks/install" "${target}"
	[ "$status" -eq 0 ]
	[ "$("${target}/gitleaks" version)" = 8.30.1 ]
	grep -q 'download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz' "${BATS_TEST_TMPDIR}/curl.log"
}

@test "duplicate revision keys fail before any installer download" {
	printf 'repos:\n  - repo: https://github.com/gitleaks/gitleaks\n    rev: v8.30.1\n    rev: v9.0.0\n' >"${repo}/.pre-commit-config.yaml"
	run bash "${repo}/s/gitleaks/install" "${target}"
	[ "$status" -eq 1 ]
	[ ! -e "${BATS_TEST_TMPDIR}/curl.log" ]
}

@test "unsupported platforms fail before downloading" {
	printf '#!/usr/bin/env bash\necho Darwin\n' >"${bin}/uname"
	chmod +x "${bin}/uname"

	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -ne 0 ]
	[[ "$output" == *"Linux x86-64"* ]]
	[ ! -e "${BATS_TEST_TMPDIR}/curl.log" ]
}

@test "duplicate checksum entries do not replace an existing installation" {
	mkdir -p "${target}"
	echo original >"${target}/gitleaks"
	cat "${release}/gitleaks_8.30.1_checksums.txt" >>"${release}/duplicate.txt"
	cat "${release}/duplicate.txt" >>"${release}/gitleaks_8.30.1_checksums.txt"

	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -ne 0 ]
	[ "$(cat "${target}/gitleaks")" = original ]
}

@test "a checksum-valid wrong binary version does not replace an installation" {
	mkdir -p "${target}"
	echo original >"${target}/gitleaks"
	printf '#!/usr/bin/env bash\necho 9.9.9\n' >"${release}/build/gitleaks"
	tar -czf "${release}/gitleaks_8.30.1_linux_x64.tar.gz" -C "${release}/build" gitleaks
	(cd "${release}" && sha256sum gitleaks_8.30.1_linux_x64.tar.gz >gitleaks_8.30.1_checksums.txt)

	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -ne 0 ]
	[ "$(cat "${target}/gitleaks")" = original ]
}

@test "downloads have finite connection and request timeouts" {
	run bash "${repo}/s/gitleaks/install" "${target}"

	[ "$status" -eq 0 ]
	grep -q -- '--connect-timeout 10 --max-time 120' "${BATS_TEST_TMPDIR}/curl-args.log"
}
