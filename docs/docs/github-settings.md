# GitHub settings

Turva's desired GitHub repository settings live in `terraform/github/` and are reviewed through pull requests. Merging these files does not apply them. An administrator must separately approve and run an apply.

Terraform manages GitHub settings only. Docker Compose and Caddy remain the existing deployment path. A Kubernetes and Helm path for MBPCC is planned in [ADR 0008](https://github.com/turva-uk/turva/blob/main/specifications/adr/0008-kubernetes-and-helm-deployment.md), not deployed by this change.

## Desired protection for the default branch

The `main` ruleset requires a pull request and one approval from someone other than its author, and dismisses stale approvals on reviewable pushes. GitHub never lets authors approve their own pull request. A reviewer who pushes to someone else's pull request can still approve it, so that reviewer's own commit is approved by nobody but them. The ruleset controls who approves, not who merges: once approved, anyone with write access can merge. It also blocks deletion and force pushes, with no bypass actors.

This is a partial protection policy. Required CI checks, resolved review threads and code-owner review remain follow-up work rather than choosing check identities or review ownership in this change. An administrator can disable the ruleset in an emergency, but must obtain approval and record the reason; that is not a routine merge path.

GitHub enforces applied settings without Terraform continuing to run. An administrator can also change them manually. A later plan may propose replacing those manual changes: inspect it and decide whether to update the files or restore the reviewed policy.

## Running it

Use `./s/terraform`, or the optional `just` aliases below. The wrapper needs Docker, `curl` and Python 3.10 or later. Terraform and its provider run in the pinned container; neither needs installing on the host.

```bash
just terraform-init    # j tfi: once, and after the provider version changes
just terraform-plan    # j tfp: reads GitHub; updates local imports, not settings
just terraform-apply   # j tfa: makes the change
```

For example, `./s/terraform plan -no-color` works without Just. Extra arguments pass through, except alternate state/configuration flags, which could separate the import from the state being planned. Only the default workspace and state are supported.

CI runs `./s/terraform init -backend=false -lockfile=readonly` and `./s/terraform validate` without GitHub credentials. These validate the configuration and locked provider schema; they do not prove the current live settings or apply anything.

### The token

Planning and applying need a token. Set `GITHUB_TOKEN`, or sign in with `gh`: the wrapper uses `gh auth token` only when `GITHUB_TOKEN` is empty. Scope a fine-grained token to `turva-uk/turva`, never commit it, and grant Administration read/write only to the administrator who applies settings.

A read-only token can read public rules, but [GitHub omits bypass actors unless the caller can write the ruleset](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset). Do not treat a metadata-only plan as a complete review of existing bypasses. Use an appropriately authorised administrator identity for the final plan and apply.

## When to apply

Apply only after explicit administrative approval, from an up-to-date, reviewed `main`. Inspect a fresh plan first and coordinate with other administrators. No workflow applies these settings automatically.

## The state

Terraform records IDs and configuration in the local, ignored `terraform/github/terraform.tfstate`. Treat state, variable files and saved plans as private, not as guaranteed secret-free files. Use the ignored `.tfplan` extension for saved plans; arbitrary output names are not automatically ignored. There is no shared backend or cross-machine lock: only one administrator should apply at a time.

Before each plan and apply, the wrapper discovers existing repository-owned rulesets over all API pages, then imports any missing from local state. Inherited organisation rulesets are not adopted. Duplicate names, incomplete identities, wrong targets and failed or excessive pagination stop the operation before importing anything. This reduces duplicate creation; it cannot prevent another administrator changing GitHub between discovery and apply.

The supported configuration uses ordinary top-level `github_repository_ruleset` blocks whose literal Terraform label equals the GitHub name, such as `resource "github_repository_ruleset" "main"` with `name = "main"`. Keep names unique. Computed names, modules, additional resource types or a different state layout need a wrapper change and regression tests before use. A name absent from GitHub is left for Terraform to propose creating.

`s/tests/terraform.bats` tests discovery and refusal paths with stand-ins; it makes no real GitHub changes.

## Versions

- **Terraform** - the image in `.pre-commit-config.yaml`, pinned by digest. The same image runs formatting, validation and the administrative wrapper.
- **The GitHub provider** - pinned in `terraform/github/versions.tf`, with committed checksums in `terraform/github/.terraform.lock.hcl`.
