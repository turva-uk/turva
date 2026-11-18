# Pre-commit checks plan

Turva's `.pre-commit-config.yaml` checks formatting, spelling, Markdown and Python style, and since #109 and #110 it runs on every commit as well as in CI. It does not look for the mistakes that hurt most in a public, safety-critical repository: a committed secret, a home network address or device name, an unsafe GitHub Actions workflow, a Python type error, or a known-insecure Python pattern. Each has a well-tried pre-commit hook, so Turva can adopt checks that are known to work rather than design them afresh.

This plan adds those checks one at a time, each as its own branch in the `pre-commit` stack on top of `feature/pre-commit-lint-staged` (#110): `check-toml`, gitleaks, the dev-details check, Zizmor as a hook, mypy and bandit. Each phase lands green: where a new check finds problems in the existing code, the phase either fixes them or narrows the check's scope, and says which in its pull request. The order puts the cheapest and most valuable checks first, so stopping early still leaves Turva better protected.

## Open questions

- [x] **What happens if gitleaks finds a secret in Git history?** Phase 2 scans the whole history once. Rewriting `main`'s history needs a force-push, which `AGENTS.md` lists as needing approval. - Report it, stop for you to rotate the secret, then add the commit to the allowlist with a reason. History is never rewritten. Answered in `/t-g`, 18 November 2026.
- [x] **Does CI keep its own online Zizmor run once the hook exists?** The hook runs with `--offline`, because the audits that ask GitHub need a token. - Yes: the `Workflow security` job keeps running Zizmor online, but reads its version from `.pre-commit-config.yaml`, so there is one pin. Answered in `/t-g`, 18 November 2026.
- [x] **What does mypy check first, and how strictly?** `safety_file/` imports no web framework, so it can be checked without Django's stubs, and strictly. `app/` needs `django-stubs` and `djangorestframework-stubs` and will report far more. - `safety_file/` only, strict, in Phase 5. `app/` waits for a later plan, informed by a first count of its errors. Answered in `/t-g`, 18 November 2026.
- [x] **Does bandit scan the tests?** Bandit reports every `assert` (B101), and pytest tests are built from them. - No: it scans `app/`, `safety_file/` and `demo/`, and excludes the test files, so B101 stays on for application code. Answered in `/t-g`, 18 November 2026.
- [x] **Where does `check-toml` go?** Turva has two TOML files today, `pyproject.toml` and `ruff.toml`. The check is one line beside `check-yaml` and `check-json` in `.pre-commit-config.yaml`. - Its own small phase, Phase 1, before gitleaks. Answered in `/t-g`, 18 November 2026.
- [x] **When is the denylist written?** - Before the run, so Phase 3's first scan of the repository also catches the literals. Made in `/t-g`. Answered in `/t-g`, 18 November 2026.
- [x] **How do the one-off scans run without installing gitleaks, mypy and bandit?** - With the copies `pre-commit` downloads for each hook into its own cache, so each scan uses exactly the version its hook pins, and nothing is installed on the system. Answered in `/t-g`, 18 November 2026.

## Before running /f

- [x] **Write your own `local/dev-details-denylist`.** Only you know the literals it should hold, such as your machines' hostnames. It is never committed, so `/t-f` cannot fill it in. - Done on 18 November 2026: made in `/t-g`.

## Phase 1: check-toml

Branch `feature/pre-commit-check-toml`.

- [x] Add the `check-toml` hook from `pre-commit-hooks` to `.pre-commit-config.yaml`, beside `check-yaml` and `check-json`, at the same `rev: v6.0.0`. It checks that `pyproject.toml` and `ruff.toml` parse, and `.gitleaks.toml` once Phase 2 adds it.

## Phase 2: gitleaks

Branch `feature/pre-commit-gitleaks`.

- [x] Add the `gitleaks` hook from `https://github.com/gitleaks/gitleaks` to `.pre-commit-config.yaml`, pinned to the latest release tag, confirmed from the gitleaks repository at build time. Dependabot's `pre-commit` ecosystem, already in `.github/dependabot.yml`, then proposes later bumps.
- [x] Add `.gitleaks.toml` with an `[extend]` block setting `useDefault = true`. A config file holding only an allowlist **replaces** gitleaks' built-in rules, so gitleaks runs with no rules and passes a real key. Add allowlist entries only for values the scan proves are not secrets, such as the test settings in `app/config/`, each with a `description` saying why.
- [x] Add `s/tests/gitleaks-config.bats`, which fails if `.gitleaks.toml` loses its `[extend]` block.
- [x] Make CI scan the pushed commits, not only the staged files. The hook scans what is staged, so CI's `pre-commit run --all-files` in the `Styling (pre-commit)` job has nothing staged and checks nothing. Add a CI step that scans the pull request's commit range. Built as `s/gitleaks/scan-commits` and `s/gitleaks/install`, run by a `Secret scan (gitleaks)` job in `ci.yml`. The install script reads its version from the hook's `rev`, so there is one pin. Pin any new action by commit SHA, with a `# vX.Y.Z` comment.
- [x] Scan the whole of Turva's Git history once, with `gitleaks git` run from the copy `pre-commit` downloaded for the hook, and record in the pull request that the scan ran and what it found. **If it finds a real secret, stop before committing** and report the commit and the rule, never the value. You rotate the secret, then the commit goes on the `.gitleaks.toml` allowlist with a reason. History is never rewritten, because that needs a force-push to `main`. Ran on 18 November 2026: 218 commits on every branch, no leaks found, with the rules shown to fire on a planted key first. So `.gitleaks.toml` needs no allowlist yet.

## Phase 3: dev-details check

Branch `feature/pre-commit-dev-details`.

- [ ] Add `s/checks/check-dev-details`, which refuses private network addresses and device MAC addresses in tracked files, plus the literals in a developer's own denylist, such as a hostname or a VPN network's name. It reports a match as `path:line` and the rule's name, never the matched text, because CI logs are as public as the files.
- [ ] Name its private list `local/dev-details-denylist`, and add `/local/` to `.gitignore`. The script makes the file, with a header explaining it, the first time it runs outside CI in a clone that has none. CI runs only the patterns, never the list.
- [ ] Add it to `.pre-commit-config.yaml` as a `local` hook over `types: [text]`.
- [ ] Add `s/tests/check-dev-details.bats`, with every made-up address and name obviously fake.
- [ ] Run it over every tracked file before turning it on. Remove any real detail it finds, and widen the patterns' exceptions only for a value that names nothing, such as a documentation address range.

## Phase 4: Zizmor as a pre-commit hook

Branch `feature/pre-commit-zizmor`.

- [ ] Add the `zizmor` hook from `https://github.com/zizmorcore/zizmor-pre-commit` to `.pre-commit-config.yaml`, at the version CI pins today (`zizmor@1.30.1` in `.github/workflows/workflow-security.yml`), with `--offline` and `--strict-collection`. Moving the pin here also fixes the gap that the workflow's own comment describes: Dependabot cannot see a version inside an action's input, but its `pre-commit` ecosystem watches this file.
- [ ] Remove the separate Zizmor step from `./s/lint`, since `pre-commit run --all-files` now runs it. Check first that the Terraform stack (#105) has not changed `s/lint` in a way this conflicts with.
- [ ] Keep `.github/workflows/workflow-security.yml`, which runs Zizmor online with the job's token, but make it read the version from `.pre-commit-config.yaml` instead of its own `tool: zizmor@1.30.1` input, so there is one pin. `./s/terraform` already reads its Terraform image pin from the same file, so follow that pattern.
- [ ] Add a `.github/zizmor.yml` only if a finding needs a recorded exception, with the reason beside each rule.

## Phase 5: mypy

Branch `feature/pre-commit-mypy`.

- [ ] Run mypy once over `safety_file/`, using the hook's own copy through `pre-commit run mypy --all-files`, its tests included, with `--strict`, and count the errors before choosing how to land it. If they are few, fix them in this phase. If they are many, land the check on the modules that pass and list the rest in an issue.
- [ ] Add the `mypy` hook from `https://github.com/pre-commit/mirrors-mypy`, limited to `files: ^safety_file/`, with `language_version: python3.14` to match `app/Dockerfile`'s `python:3.14.9-slim`. Put its settings, `strict = true` among them, in a `[tool.mypy]` block in `pyproject.toml`, so the hook and a bare `mypy` agree. `AGENTS.md` forbids only `[tool.ruff]` there.
- [ ] Give the hook the only two packages `safety_file/` needs beyond the standard library, `types-PyYAML` for `yaml` and `pytest` for its tests, as `additional_dependencies` pinned to the versions in `app/requirements*.txt`. An unpinned package takes whatever PyPI has newest, and fails on typing that the locked version does not share.
- [ ] Leave `app/` unchecked, and open an issue for a later plan that records how many errors a first non-strict run over `app/` reports, with `django-stubs` and `djangorestframework-stubs`.

## Phase 6: bandit

Branch `feature/pre-commit-bandit`.

- [ ] Run bandit once over `app/`, `safety_file/` and `demo/`, using the hook's own copy through `pre-commit run bandit --all-files`, with the test files excluded, and triage what it reports. Fix a real finding. Mark a false one with bandit's skip comment and the rule's code, plus a comment saying why it is safe.
- [ ] Add the `bandit` hook from `https://github.com/PyCQA/bandit`, with `language_version: python3.14`, and its settings in a `[tool.bandit]` block in `pyproject.toml`.
- [ ] Decide whether Turva needs a bandit wrapper that checks the scan really covered the code. Bandit silently skips a file it cannot parse, so add the wrapper if a file is skipped on the first run.
- [ ] If a finding touches permissions, the audit trail or the risk matrix, update `SAFETY.md` in the same commit, as `AGENTS.md` requires.

## Decisions

- **One branch for each check.** Each check can fail the existing code in its own way, and a reviewer can judge one check's findings and exceptions in twenty minutes. Five checks in one pull request would hide one check's exceptions among another's.
- **The bats tests still need #105 to run automatically.** `./s/test` runs `bats s/tests` only once the Terraform stack (#105) merges. Until then each phase's bats test runs by hand, and its pull request says so.
