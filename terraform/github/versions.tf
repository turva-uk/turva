# Turva's GitHub repository settings, as code. See README.md for what is
# managed here, how to apply it, and why nothing depends on it.

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
