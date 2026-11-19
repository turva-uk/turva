# Pre-commit checks plan

Turva's `.pre-commit-config.yaml` checks formatting, spelling, Markdown and Python style in CI. Local hooks from #109 and #110 are optional, enabled deliberately with `./s/install-hooks`; CI still checks changes made without them. This plan adds secret scanning, network-detail checks, Python type checking and security linting, and brings the existing Zizmor audit into the hook configuration.

Each check has its own branch in the `pre-commit` stack above #110: `check-toml`, gitleaks, the dev-details check, Zizmor as a hook, mypy and bandit. Each phase must pass before merging. Fix real findings; document and justify any deliberate scope limit or narrowly identified false positive rather than weakening a check to get a green result.

## Agreed boundaries

- **Secrets in history:** stop publication and report the commit and rule, never the value. An authorised administrator rotates the secret. Any later exception needs explicit review and must not hide other findings in the same commit. Do not rewrite history.
- **Zizmor:** keep both the offline local audit and the token-enabled online CI audit, using one pin.
- **Python types:** check `safety_file/` and its tests strictly first. Django typing needs a separately reviewed follow-up, not silently missing imports or weaker storage checks.
- **Bandit:** check production Python in `app/`, `safety_file/` and `demo/`, excluding test files rather than disabling B101 for application code.
- **TOML:** add `check-toml` beside the existing YAML and JSON hooks, at their existing reviewed repository pin.
- **Personal literals:** a private denylist is optional. Never require personal setup, create it automatically in another working tree, or edit shared Git exclusions during a scan. Use the adopted ignored `.private/` directory for an explicitly supplied local list.
- **Tool installation:** use the hooks' isolated environments, or a reviewed checksum-verified copy of the same pinned release, for one-off scans. Nothing installs packages merely because local hooks were enabled.

## Phase 1: check-toml

Branch `feature/pre-commit-check-toml`.

- [x] Add the `check-toml` hook from `pre-commit-hooks` to `.pre-commit-config.yaml`, beside `check-yaml` and `check-json`, at the same `rev: v6.0.0`. It checks that `pyproject.toml` and `ruff.toml` parse, and `.gitleaks.toml` once Phase 2 adds it.

## Phase 2: gitleaks

Branch `feature/pre-commit-gitleaks`.

- [x] Add the `gitleaks` hook from `https://github.com/gitleaks/gitleaks` to `.pre-commit-config.yaml`, pinned to the latest release tag, confirmed from the gitleaks repository at build time. Dependabot's `pre-commit` ecosystem, already in `.github/dependabot.yml`, then proposes later bumps.
- [x] Add `.gitleaks.toml` with an `[extend]` block setting `useDefault = true`. A config file holding only an allowlist **replaces** gitleaks' built-in rules, so gitleaks runs with no rules and passes a real key. Add allowlist entries only for values the scan proves are not secrets, such as the test settings in `app/config/`, each with a `description` saying why.
- [x] Add `s/tests/gitleaks-config.bats`, which fails if `.gitleaks.toml` loses its `[extend]` block.
- [x] Make CI scan the pushed commits, not only the staged files. The hook scans what is staged, so CI's `pre-commit run --all-files` in the `Styling (pre-commit)` job has nothing staged and checks nothing. Add a CI step that scans the pull request's commit range. Built as `s/gitleaks/scan-commits` and `s/gitleaks/install`, run by a `Secret scan (gitleaks)` job in `ci.yml`. The install script reads its version from the hook's `rev`, so there is one pin. Pin any new action by commit SHA, with a `# vX.Y.Z` comment.
- [x] Scan Turva's Git history with the pinned gitleaks release, and record the scope and result in the pull request. First prove the configured rules detect a synthetic canary; scanner errors are not detections. **If a real secret is found, stop publication** and follow the reviewed rotation and exception boundary above. Never print its value or rewrite history. Repeated on 19 November 2026 with checksum-verified v8.30.1: all 360 commits reachable from current local refs, including remote-tracking refs, with no findings or allowlist exceptions. The canary produced the expected redacted JSON finding; scanner errors fail separately.

## Phase 3: dev-details check

Branch `feature/pre-commit-dev-details`.

- [x] Add `s/checks/check-dev-details`, which refuses private network addresses and device MAC addresses in tracked files, plus the literals in a developer's own denylist, such as a hostname or a VPN network's name. It reports a match as `path:line` and the rule's name, never the matched text, because CI logs are as public as the files.
- [x] Support an optional, explicitly supplied private list such as `.private/dev-details-denylist`. Scans do not create personal files, change another working tree or modify shared Git configuration. CI runs the shared patterns without requiring a personal list. Existing per-checkout lists may be read outside CI; a supplied list also applies to test-named files. Legacy `local/` files stay ignored but are not automatically read or migrated.
- [x] Add it to `.pre-commit-config.yaml` as a `local` hook over `types: [text]`.
- [x] Add `s/tests/check-dev-details.bats`, with every made-up address and name obviously fake.
- [x] Run it over every tracked file before turning it on. Remove any real detail it finds, and widen the patterns' exceptions only for a value that names nothing, such as a documentation address range. Repeated on 19 November 2026 with the read-only scanner and no personal list: the shared text checks passed. Synthetic pattern-fixture names, CIDRs and addresses ending `.0` retain deliberate exceptions; IPv6 and binary content remain outside this check. These limits do not exempt supplied personal literals or prove test content is fictional.

## Phase 4: Zizmor as a pre-commit hook

Branch `feature/pre-commit-zizmor`.

- [x] Add the `zizmor` hook from `https://github.com/zizmorcore/zizmor-pre-commit` to `.pre-commit-config.yaml`, at the version CI pins today (`zizmor@1.30.1` in `.github/workflows/workflow-security.yml`), with `--offline` and `--strict-collection`. Moving the pin here also fixes the gap that the workflow's own comment describes: Dependabot cannot see a version inside an action's input, but its `pre-commit` ecosystem watches this file.
- [x] Remove the separate Zizmor step from `./s/lint`, since `pre-commit run --all-files` now runs it. Check first that the Terraform stack (#105) has not changed `s/lint` in a way this conflicts with.
- [x] Keep `.github/workflows/workflow-security.yml`, which runs Zizmor online with the job's token, but make it read the version from `.pre-commit-config.yaml` instead of its own `tool: zizmor@1.30.1` input, so there is one pin. `./s/terraform` already reads its Terraform image pin from the same file, so follow that pattern. Built as `s/checks/hook-version`, which the workflow calls.
- [x] Add a `.github/zizmor.yml` only if a finding needs a recorded exception, with the reason beside each rule. Not needed: the hook passed every workflow with no exception.

## Phase 5: mypy

Branch `feature/pre-commit-mypy`.

- [x] Run mypy once over `safety_file/`, using the hook's own copy through `pre-commit run mypy --all-files`, its tests included, with `--strict`, and count the errors before choosing how to land it. If they are few, fix them in this phase. If they are many, land the check on the modules that pass and list the rest in an issue. Ran on 18 November 2026: 158 errors, 22 in the code and 136 in the tests. The 22 were missing or loose annotations, fixed here without changing behaviour. The tests are still type-checked, but an override lets their functions go unannotated until #117 annotates them.
- [x] Add the `mypy` hook from `https://github.com/pre-commit/mirrors-mypy`, limited to `files: ^safety_file/`, with `language_version: python3.14` to match `app/Dockerfile`'s `python:3.14.9-slim`. Put its settings, `strict = true` among them, in a `[tool.mypy]` block in `pyproject.toml`, so the hook and a bare `mypy` agree. `AGENTS.md` forbids only `[tool.ruff]` there.
- [x] Declare and pin the hook's runtime dependencies, test dependencies and type stubs. Match runtime/test versions to the application locks where applicable, so mypy checks the versions the code actually uses. The reviewed environment explicitly includes PyYAML as well as its stubs; a script test checks the runtime/test pins against the application lock. Real configured-hook probes reject a production error and an error inside an unannotated test body.
- [x] Leave `app/` unchecked, and open an issue for a later plan that records how many errors a first non-strict run over `app/` reports, with `django-stubs` and `djangorestframework-stubs`. Opened as #118. Departed from the plan: the issue makes the count its first step, because counting needs Django and its stubs installed beside mypy, which the hook does not have.

## Phase 6: bandit

Branch `feature/pre-commit-bandit`.

- [x] Run bandit once over `app/`, `safety_file/` and `demo/`, using the hook's own copy through `pre-commit run bandit --all-files`, with the test files excluded, and triage what it reports. Fix a real finding. Mark a false one with bandit's skip comment and the rule's code, plus a comment saying why it is safe. Ran on 18 November 2026: 14 findings, all false. Six were B404, which flags every `import subprocess`, so the hook skips B404 and relies on B603 for each call. The other eight each got a skip comment with its reason.
- [x] Add the `bandit` hook from `https://github.com/PyCQA/bandit`, with `language_version: python3.14`, and its settings in a `[tool.bandit]` block in `pyproject.toml`. Departed from the plan: the settings went in the hook instead, because bandit ignores `exclude_dirs` for files that pre-commit names one by one.
- [x] Decide whether Turva needs a bandit wrapper that checks the scan really covered the code. A review probe demonstrated Bandit returning success while skipping a syntax-invalid requested file. The configured hook now requires a bounded report with no errors and metrics for exactly the requested sources, consistent counts and status. Real-hook probes reject that skip, an unsafe assertion and a shell command; a complete baseline and genuinely empty source pass.
- [x] If a finding touches permissions, the audit trail or the risk matrix, update `SAFETY.md` in the same commit, as `AGENTS.md` requires. The seven source Python changes are narrowly justified suppression comments with identical runtime ASTs. No safety rule or evidence behaviour changes, so no runtime update to `SAFETY.md` is needed; the hazards remain open.

## Decisions

- **One branch for each check.** Each check can fail the existing code in its own way, and a reviewer can judge one check's findings and exceptions in twenty minutes. Five checks in one pull request would hide one check's exceptions among another's.
- **Script tests run in the shared gate.** The merged Terraform stack added `bats s/tests` to `./s/test` and CI. Bats uses stand-ins for external services on the host/runner; no application container or personal task runner is needed for those tests.
