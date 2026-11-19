# The token comes from GITHUB_TOKEN. Applying needs Administration read/write.
# GitHub omits bypass actors for readers without ruleset write access, so a
# metadata-only plan is not a complete review of the existing settings.
provider "github" {
  owner = "turva-uk"
}

# Confirms the token can see the repository, so a plan fails early and
# plainly rather than part-way through a change.
data "github_repository" "turva" {
  full_name = "turva-uk/turva"
}
