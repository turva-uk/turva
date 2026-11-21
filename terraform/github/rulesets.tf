# Rules for main, the default branch. Every change reaches it through a pull
# request; nothing is pushed to it directly, force-pushed or deleted.
#
# Each pull request needs one approval from someone other than its author.
# GitHub never lets authors approve their own pull request, so no setting is
# needed for that. dismiss_stale_reviews_on_push clears approvals on every
# new push, so a commit added after the approval cannot be merged unreviewed.
#
# require_last_push_approval is off on purpose, so a reviewer who pushes to
# someone else's pull request can still approve it. The known gap: that
# reviewer's own commit is then approved by nobody but them.
#
# Rulesets control who approves, not who merges. Once approved, anyone with
# write access can merge, the author included.
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
      required_approving_review_count = 1
      require_last_push_approval      = false
      dismiss_stale_reviews_on_push   = true
    }
  }
}
