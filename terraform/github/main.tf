# The token comes from GITHUB_TOKEN. Reading needs Metadata; applying needs
# Administration: read and write on this repository.
provider "github" {
  owner = "turva-uk"
}

# Confirms the token can see the repository, so a plan fails early and
# plainly rather than part-way through a change.
data "github_repository" "turva" {
  full_name = "turva-uk/turva"
}
