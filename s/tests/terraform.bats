#!/usr/bin/env bats
# Tests for s/terraform. Each test runs a copy of the script in a scratch
# repository, with stand-ins for docker and curl, so nothing reaches Docker
# or GitHub. Run with: bats s/tests

IMAGE='hashicorp/terraform:1.17.2@sha256:0000000000000000000000000000000000000000000000000000000000000000'

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"

	mkdir -p "${repo}/s/utils" "${repo}/terraform/github" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../terraform" "${repo}/s/terraform"
	cp "${BATS_TEST_DIRNAME}/../utils/logging.sh" "${repo}/s/utils/logging.sh"
	touch "${repo}/terraform/github/versions.tf"
	printf '      - id: terraform-fmt\n        entry: %s fmt -check\n' "${IMAGE}" >"${repo}/.pre-commit-config.yaml"

	# docker records each call, and answers `state list` with $STATE_LIST, or
	# fails it when $STATE_LIST_FAILS is set.
	cat >"${bin}/docker" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TEST_TMPDIR}/docker.log"
if [[ " $* " == *" state list "* ]]; then
	if [ -n "${STATE_LIST_FAILS:-}" ]; then
		echo "docker: cannot connect to the Docker daemon" >&2
		exit 1
	fi
	printf '%b' "${STATE_LIST:-}"
fi
EOF

	# curl records each call, and answers with $RULESETS.
	cat >"${bin}/curl" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TEST_TMPDIR}/curl.log"
printf '%s' "${RULESETS:-[]}"
EOF

	# gh answers `auth token` with $GH_TOKEN_STUB, or fails as if signed out.
	cat >"${bin}/gh" <<'EOF'
#!/usr/bin/env bash
if [ "$*" = "auth token" ] && [ -n "${GH_TOKEN_STUB:-}" ]; then
	echo "${GH_TOKEN_STUB}"
	exit 0
fi
exit 1
EOF

	chmod +x "${bin}/docker" "${bin}/curl" "${bin}/gh"
	export PATH="${bin}:${PATH}"

	# What the stand-ins answer until a test says otherwise: an empty state,
	# and no rulesets on GitHub.
	export GITHUB_TOKEN=test-token
	export STATE_LIST=""
	export STATE_LIST_FAILS=""
	export GH_TOKEN_STUB=""
	export RULESETS="[]"

	touch "${BATS_TEST_TMPDIR}/docker.log" "${BATS_TEST_TMPDIR}/curl.log"
}

define_ruleset() {
	local name="$1"

	cat >>"${repo}/terraform/github/rulesets.tf" <<EOF
resource "github_repository_ruleset" "${name}" {
  name = "${name}"
}
EOF
}

docker_calls() { cat "${BATS_TEST_TMPDIR}/docker.log"; }
curl_calls() { cat "${BATS_TEST_TMPDIR}/curl.log"; }

@test "with no arguments it prints the usage and exits 2" {
	run "${repo}/s/terraform"

	[ "$status" -eq 2 ]
	[[ "$output" == *"Usage: ./s/terraform"* ]]
	[ -z "$(docker_calls)" ]
}

@test "plan without GITHUB_TOKEN refuses before running anything" {
	unset GITHUB_TOKEN

	run "${repo}/s/terraform" plan

	[ "$status" -eq 1 ]
	[[ "$output" == *"[terraform] ERROR: No GitHub token"* ]]
	[ -z "$(docker_calls)" ]
	[ -z "$(curl_calls)" ]
}

@test "it refuses when the image pin is missing from .pre-commit-config.yaml" {
	: >"${repo}/.pre-commit-config.yaml"

	run "${repo}/s/terraform" init

	[ "$status" -eq 1 ]
	[[ "$output" == *"Could not read the pinned Terraform image"* ]]
}

@test "init needs no token, asks GitHub nothing, and runs the pinned image" {
	unset GITHUB_TOKEN

	run "${repo}/s/terraform" init

	[ "$status" -eq 0 ]
	[ -z "$(curl_calls)" ]
	[[ "$(docker_calls)" == *"${IMAGE} init"* ]]
}

@test "it runs Terraform as the calling user, in terraform/github" {
	run "${repo}/s/terraform" init

	[[ "$(docker_calls)" == *"--user $(id -u):$(id -g)"* ]]
	[[ "$(docker_calls)" == *"-v ${repo}/terraform/github:/workspace"* ]]
}

@test "plan imports a ruleset GitHub has that the state does not know" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "release"}, {"id": 42, "name": "main"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$output" == *'Importing the existing "main" ruleset (42)'* ]]
	[[ "$(docker_calls)" == *"import -input=false github_repository_ruleset.main turva:42"* ]]
	[[ "$(docker_calls | tail -1)" == *"${IMAGE} plan"* ]]
}

@test "plan does not import a ruleset the state already holds" {
	define_ruleset main
	touch "${repo}/terraform/github/terraform.tfstate"
	export STATE_LIST='github_repository_ruleset.main\n'
	export RULESETS='[{"id": 42, "name": "main"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "plan leaves a ruleset GitHub does not have for Terraform to create" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "release"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "with no rulesets in the files it does not ask GitHub" {
	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[ -z "$(curl_calls)" ]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "apply imports first too" {
	define_ruleset main
	export RULESETS='[{"id": 42, "name": "main"}]'

	run "${repo}/s/terraform" apply

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" == *"github_repository_ruleset.main turva:42"* ]]
	[[ "$(docker_calls | tail -1)" == *"${IMAGE} apply"* ]]
}

@test "a failed look-up on GitHub stops before plan runs" {
	define_ruleset main
	printf '#!/usr/bin/env bash\nexit 22\n' >"${bin}/curl"

	run "${repo}/s/terraform" plan

	[ "$status" -eq 1 ]
	[[ "$output" == *"Could not list the rulesets on GitHub"* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "sourcing the script defines its functions and runs nothing" {
	source "${repo}/s/terraform"

	declare -F main ruleset_id import_existing_rulesets >/dev/null
	[ -z "$(docker_calls)" ]
	[ -z "$(curl_calls)" ]
}

@test "ruleset_id picks the ruleset with the given name, or prints nothing" {
	local rulesets='[{"id": 7, "name": "release"}, {"id": 42, "name": "main"}]'
	source "${repo}/s/terraform"

	run ruleset_id main <<<"${rulesets}"

	[ "$status" -eq 0 ]
	[ "$output" = "42" ]

	run ruleset_id missing <<<"${rulesets}"

	[ "$status" -eq 0 ]
	[ -z "$output" ]
}

@test "with no state file it does not ask Terraform for the state" {
	define_ruleset main

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *"state list"* ]]
}

@test "a failing state list stops the script with its own message" {
	define_ruleset main
	touch "${repo}/terraform/github/terraform.tfstate"
	export STATE_LIST_FAILS=1

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"cannot connect to the Docker daemon"* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
	[ -z "$(curl_calls)" ]
}

@test "no Terraform files stops the script with a clear message" {
	rm "${repo}/terraform/github/"*.tf

	run "${repo}/s/terraform" plan

	[ "$status" -eq 1 ]
	[[ "$output" == *"Could not read the Terraform files in terraform/github/"* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "without GITHUB_TOKEN, plan uses the token from gh" {
	unset GITHUB_TOKEN
	export GH_TOKEN_STUB=token-from-gh
	define_ruleset main

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(curl_calls)" == *"Bearer token-from-gh"* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "GITHUB_TOKEN wins over the token from gh" {
	export GH_TOKEN_STUB=token-from-gh
	define_ruleset main

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(curl_calls)" == *"Bearer test-token"* ]]
}
