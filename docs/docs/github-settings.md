# GitHub settings

Turva's GitHub repository settings, such as the rules protecting `main`, are
kept as Terraform in `terraform/github/`. A change to them is reviewed in a
pull request like any other change, and the history says who changed what
and why.

Terraform here manages GitHub settings only. Turva is deployed with Helm and
Kubernetes.

## Nothing depends on Terraform

Terraform writes ordinary GitHub settings, such as rulesets. They work the
same whether or not Terraform is ever run again, and an admin can still
change them in the repository's settings on GitHub. If that happens, the
next `./s/terraform plan` shows the difference, and the files are updated
to match or the change is put back.

## Running it

Use the `just` recipes. Each runs `./s/terraform`, which runs Terraform in a
pinned container, so only Docker is needed:

```bash
just terraform-init    # j tfi: once, and after the provider version changes
just terraform-plan    # j tfp: shows what would change on GitHub; changes nothing
just terraform-apply   # j tfa: makes the change
```

Before every plan and apply, it reads the rulesets already on GitHub, so
what it shows is measured against GitHub as it is now. Extra arguments are
passed on to Terraform, such as `j tfp -no-color`.

`./s/terraform` does the same without `just`: `./s/terraform plan`.

### The token

Planning and applying need a GitHub token. If you use the GitHub
command-line tool, `gh`, and are signed in, nothing more is needed: the
token is taken from `gh` when `GITHUB_TOKEN` is not set.

Otherwise, make a fine-grained personal access token for `turva-uk/turva`,
and put it in `GITHUB_TOKEN`. It needs:

- **Metadata: read**, for `plan`.
- **Administration: read and write**, for `apply`. Only a repository admin
  can apply.

## When to apply

Apply after the pull request has merged, from an up-to-date `main`. Until then,
a merged change to these settings is written down but not yet in force.

## The state

Terraform records what it manages in `terraform/github/terraform.tfstate`.
It is git-ignored and holds no secrets, only the settings' IDs. There is no
shared backend, so Turva depends on no storage service for it.

The state does not need sharing either. Before every `plan` and `apply`,
`./s/terraform` looks on GitHub for each ruleset the files define that the
local state does not know about, by name, and imports it. So anyone can
plan or apply from any machine, with or without a state file, and Terraform
never tries to create a ruleset that already exists.

That look-up relies on one rule: **a ruleset's Terraform name is its name
on GitHub**, so `resource "github_repository_ruleset" "main"` has
`name = "main"`. A ruleset GitHub does not have yet is left for `plan` to
create.

If Terraform later manages other kinds of setting, `./s/terraform` needs a
look-up for each kind as well. `s/tests/terraform.bats` tests the one for
rulesets.

## Versions

- **Terraform** - the image in `.pre-commit-config.yaml`, pinned by digest.
  The same image runs the format check in `./s/lint` and in CI.
- **The GitHub provider** - pinned in `terraform/github/versions.tf`, with
  its checksums in `terraform/github/.terraform.lock.hcl`, which is
  committed.
