#!/usr/bin/env bats
# Tests for s/terraform. Each test runs a copy of the script in a scratch
# repository, with stand-ins for docker and curl, so nothing reaches Docker
# or GitHub. Run with: bats s/tests

# Each Bats test intentionally has its own process and exported fixture values.
# Changes must not leak into another test's environment.
# shellcheck disable=SC2030,SC2031

IMAGE='hashicorp/terraform:1.17.2@sha256:0000000000000000000000000000000000000000000000000000000000000000'

setup() {
	repo="${BATS_TEST_TMPDIR}/repo"
	bin="${BATS_TEST_TMPDIR}/bin"

	mkdir -p "${repo}/s/utils" "${repo}/terraform/github" "${bin}"
	cp "${BATS_TEST_DIRNAME}/../terraform" "${repo}/s/terraform"
	cp "${BATS_TEST_DIRNAME}/../utils/logging.sh" "${repo}/s/utils/logging.sh"
	cp "${BATS_TEST_DIRNAME}/../utils/github-rulesets.py" "${repo}/s/utils/github-rulesets.py"
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
if [[ " $* " == *" workspace show "* ]]; then
	printf '%s\n' "${WORKSPACE:-default}"
fi
EOF

	# curl records each call, and answers with $RULESETS.
	cat >"${bin}/curl" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TEST_TMPDIR}/curl.log"
if [[ "$*" == *"page=2"* ]]; then
	if [ -n "${CURL_FAIL_PAGE_2:-}" ]; then
		exit 22
	fi
	printf '%s' "${RULESETS_PAGE_2:-[]}"
	exit 0
fi
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
	export RULESETS_PAGE_2="[]"
	export CURL_FAIL_PAGE_2=""
	export WORKSPACE=default

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
	export RULESETS='[{"id": 7, "name": "release", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

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
	export RULESETS='[{"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "plan leaves a ruleset GitHub does not have for Terraform to create" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "release", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "with no rulesets in the files it does not run ruleset discovery" {
	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[ -z "$(curl_calls)" ]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "apply imports first too" {
	define_ruleset main
	export RULESETS='[{"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

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
	local rulesets='[{"id": 7, "name": "release", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'
	source "${repo}/s/terraform"

	run ruleset_id main turva-uk/turva <<<"${rulesets}"

	[ "$status" -eq 0 ]
	[ "$output" = "42" ]

	run ruleset_id missing turva-uk/turva <<<"${rulesets}"

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

@test "duplicate repository names stop before import or plan" {
	define_ruleset main
	export RULESETS='[{"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 43, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"Ambiguous ruleset name"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "ambiguous names still stop when local state already knows the resource" {
	define_ruleset main
	touch "${repo}/terraform/github/terraform.tfstate"
	export STATE_LIST='github_repository_ruleset.main\n'
	export RULESETS='[{"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 43, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"Ambiguous ruleset name"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "an inherited same-name ruleset is never imported as repository-owned" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "main", "source_type": "Organization", "source": "turva-uk", "target": "branch"}, {"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" == *"github_repository_ruleset.main turva:42"* ]]
	[[ "$(docker_calls)" != *"turva:7"* ]]
	[[ "$(curl_calls)" == *"includes_parents=false"* ]]
}

@test "a same-name tag ruleset cannot be adopted as a branch ruleset" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "tag"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"not a branch ruleset"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "a ruleset beyond the first API page is found before plan" {
	define_ruleset main
	RULESETS="$(python3 -c 'import json; print(json.dumps([{"id": i + 1, "name": f"other-{i}", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"} for i in range(100)]))')"
	export RULESETS
	export RULESETS_PAGE_2='[{"id": 142, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" == *"github_repository_ruleset.main turva:142"* ]]
	[[ "$(curl_calls)" == *"page=2"* ]]
}

@test "failure on a later API page prevents import and apply" {
	define_ruleset main
	RULESETS="$(python3 -c 'import json; print(json.dumps([{"id": i + 1, "name": f"other-{i}", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"} for i in range(100)]))')"
	export RULESETS CURL_FAIL_PAGE_2=1

	run "${repo}/s/terraform" apply

	[ "$status" -ne 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} apply"* ]]
}

@test "malformed successful API responses fail visibly before plan" {
	define_ruleset main
	export RULESETS='{"message": "not a ruleset array"}'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"Invalid ruleset response"* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "missing ruleset identity metadata is not treated as a safe match" {
	define_ruleset main
	export RULESETS='[{"id": 42, "name": "main"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "non-default workspaces stop before discovery and plan" {
	define_ruleset main
	export WORKSPACE=personal

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"default workspace"* ]]
	[ -z "$(curl_calls)" ]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "alternate state flags cannot bypass the imported state" {
	define_ruleset main

	run "${repo}/s/terraform" plan -state=other.tfstate

	[ "$status" -ne 0 ]
	[[ "$output" == *"default state"* ]]
	[ -z "$(curl_calls)" ]
	[ -z "$(docker_calls)" ]
}

@test "global configuration flags cannot bypass discovery" {
	define_ruleset main

	run "${repo}/s/terraform" -chdir=other plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"default state and configuration"* ]]
	[ -z "$(curl_calls)" ]
	[ -z "$(docker_calls)" ]
}

@test "a foreign repository's same-name ruleset is never adopted" {
	define_ruleset main
	export RULESETS='[{"id": 7, "name": "main", "source_type": "Repository", "source": "turva-uk/other", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -eq 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" == *"${IMAGE} plan"* ]]
}

@test "duplicate names across pages stop before any import" {
	define_ruleset main
	RULESETS="$(python3 -c 'import json; print(json.dumps([{"id": i + 1, "name": "main" if i == 0 else f"other-{i}", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"} for i in range(100)]))')"
	export RULESETS
	export RULESETS_PAGE_2='[{"id": 142, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" apply

	[ "$status" -ne 0 ]
	[[ "$output" == *"Ambiguous ruleset name"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} apply"* ]]
}

@test "all intended adoptions are validated before the first import" {
	define_ruleset release
	define_ruleset main
	export RULESETS='[{"id": 5, "name": "release", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 42, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}, {"id": 43, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "non-JSON API output stops before import or plan" {
	define_ruleset main
	export RULESETS='not-json'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "boolean ruleset IDs are refused" {
	define_ruleset main
	export RULESETS='[{"id": true, "name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"Invalid ruleset response"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
}

@test "missing ruleset IDs are refused" {
	define_ruleset main
	export RULESETS='[{"name": "main", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"}]'

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"Invalid ruleset response"* ]]
	[[ "$(docker_calls)" != *" import "* ]]
}

@test "unending pagination is bounded and never runs plan" {
	define_ruleset main
	RULESETS="$(python3 -c 'import json; print(json.dumps([{"id": i + 1, "name": f"other-{i}", "source_type": "Repository", "source": "turva-uk/turva", "target": "branch"} for i in range(100)]))')"
	export RULESETS
	export RULESETS_PAGE_2="${RULESETS}"

	run "${repo}/s/terraform" plan

	[ "$status" -ne 0 ]
	[[ "$output" == *"pagination exceeded 20 pages"* ]]
	[ "$(wc -l <"${BATS_TEST_TMPDIR}/curl.log")" -eq 20 ]
	[[ "$(docker_calls)" != *" import "* ]]
	[[ "$(docker_calls)" != *"${IMAGE} plan"* ]]
}

@test "validate needs no GitHub token or ruleset discovery" {
	unset GITHUB_TOKEN
	define_ruleset main

	run "${repo}/s/terraform" validate -no-color

	[ "$status" -eq 0 ]
	[ -z "$(curl_calls)" ]
	[[ "$(docker_calls)" == *"${IMAGE} validate -no-color"* ]]
}
