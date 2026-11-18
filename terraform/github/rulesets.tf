# Rules for main, the default branch. Every change reaches it through a pull
# request; nothing is pushed to it directly, force-pushed or deleted.
#
# There are no bypass actors, administrators included. In an emergency an
# admin can switch the ruleset off in the repository's settings, and should
# say why in the pull request or issue that needed it.
#
# The Terraform name, "main", must match the name on GitHub: ./s/terraform
# finds an existing ruleset by its name and imports it before every plan.
resource "github_repository_ruleset" "main" {
  name        = "main"
  repository  = data.github_repository.turva.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count = 0
    }
  }
}
