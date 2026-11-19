# Turva's GitHub repository settings, as code. See
# docs/docs/github-settings.md for the scope and explicit apply boundary.

terraform {
  # The image ./s/terraform runs is pinned in .pre-commit-config.yaml.
  required_version = "~> 1.17.2"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "6.13.0"
    }
  }
}
