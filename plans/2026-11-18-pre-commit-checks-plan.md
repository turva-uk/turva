# Pre-commit checks plan

Turva's `.pre-commit-config.yaml` checks formatting, spelling, Markdown and Python style in CI. Local hooks from #109 and #110 are optional, enabled deliberately with `./s/install-hooks`; CI still checks changes made without them. This plan adds secret scanning, network-detail checks, Python type checking and security linting, and brings the existing Zizmor audit into the hook configuration.

Each check has its own branch in the `pre-commit` stack above #110: `check-toml`, gitleaks, the dev-details check, Zizmor as a hook, mypy, bandit and ShellCheck, followed by count floors and reach checks. Each phase must pass before merging. Fix real findings; document and justify any deliberate scope limit or narrowly identified false positive rather than weakening a check to get a green result.

## Agreed boundaries

- **Secrets in history:** stop publication and report the commit and rule, never the value. An authorised administrator rotates the secret. Any later exception needs explicit review and must not hide other findings in the same commit. Do not rewrite history.
- **Zizmor:** keep both the offline local audit and the token-enabled online CI audit, using one pin.
- **Python types:** check `safety_file/` and its tests strictly first. Django typing needs a separately reviewed follow-up, not silently missing imports or weaker storage checks.
- **Bandit:** check production Python in `app/`, `safety_file/` and `demo/`, excluding test files rather than disabling B101 for application code.
- **TOML:** add `check-toml` beside the existing YAML and JSON hooks, at their existing reviewed repository pin.
- **Personal literals:** a private denylist is optional. Never require personal setup, create it automatically in another working tree, or edit shared Git exclusions during a scan. Use the adopted ignored `.private/` directory for an explicitly supplied local list.
- **Tool installation:** use the hooks' isolated environments, or a reviewed checksum-verified copy of the same pinned release, for one-off scans. Nothing installs packages merely because local hooks were enabled.

## Floor decisions

- [x] **Do floors cover the hooks, the test suites or both?** A check can pass while checking nothing: a Bandit hook given a wrong argument scans no lines, a mypy hook that finds no config never applies `strict`, and pytest never runs a test file it does not collect. - Both: every pre-commit hook and every test suite, in Phase 8. Answered 19 November 2026.
- [x] **How is each floor set?** The alternative was to fail on any drop at all, which also fails when a test is deleted on purpose. - About 90% of the count measured when Phase 8 is built, written beside a comment saying when and from what, and raised by hand as the code grows. Answered in `/t-g`, 19 November 2026.
- [x] **May the reach check use pre-commit's own internal code?** Asking pre-commit which files each hook receives means importing `pre_commit.commands.run.Classifier`, which is not a published interface, so a pre-commit upgrade could break it. The check then fails loudly instead of passing, and the pre-commit version is pinned. The alternative is to copy pre-commit's matching rules into the script, which can drift from the real ones without anything noticing. - Yes: it imports pre-commit's own matching code, and fails loudly if an upgrade changes it. Answered in `/t-g`, 19 November 2026.
- [x] **What happens to the bats floor while bats does not run in CI?** The 66 bats tests, and the floors' own bats tests, only run in CI once #105 adds its `Script tests (bats)` job. - Phase 8 floors pytest and Vitest now, and an issue records adding the bats floor once #105 has merged. Answered in `/t-g`, 19 November 2026.
- [x] **How do the floors keep up as the code grows?** A reminder in a passing CI job gets ignored, and a weekly job opening its own pull request needs a token that can write to the repository. - A ratchet: the check also fails when a floor has fallen below 70% of the count it measures, which happens after about 29% growth since the floor was set at 90%. Its message says to run `just floors-update`, which rewrites every floor to 90% of today's count, committed in the same pull request. Answered 19 November 2026.
- [x] **Does a stale floor fail CI?** Failing a build because the code grew feels like a punishment, and a command nobody remembers to run gets dodged rather than run. - No: only a count below its floor fails. `./s/lint`, `./s/test` and `./s/frontend`, which run before every commit, raise a stale floor to 90% of today's count themselves, so the change is committed with the work. CI only reports a stale floor. `just floors-update` stays for resetting every floor on purpose. Answered 19 November 2026.
- [x] **Where do the floors' bats tests live?** Settled from the code: flat in `s/tests/`, because #105's job and `./s/test` run `bats s/tests`, which does not look in subfolders. Settled in `/t-g`, 19 November 2026.
- [x] **Do the hook floors get their own CI job?** Settled from the code: no, a step after `Run pre-commit` in the `Styling (pre-commit)` job, which has every hook already installed and cached. A job of its own would install them all again. Settled in `/t-g`, 19 November 2026.
- [x] **Does a test floor apply when only some tests are run?** Settled from the code: no. `./s/test` takes a path to run part of a suite, and a floor there would fail every partial run. The floor applies to a full run only: CI, and `./s/test` with no path. Settled in `/t-g`, 19 November 2026.

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

## Phase 7: ShellCheck

Branch `feature/pre-commit-shellcheck`. Added on 18 November 2026, after the first six phases had landed. ShellCheck runs when a contributor has deliberately enabled local hooks, and in CI's `Styling (pre-commit)` job regardless of that preference.

- [x] Run ShellCheck once over every shell file, using the hook's own copy through `pre-commit run shellcheck --all-files`, and triage what it reports. Ran on 18 November 2026: the 20 scripts in `s/` and `.githooks/` all passed. The findings were all in three bats tests: one `cd` without a fallback, fixed, and two kinds of false alarm, each turned off with a comment saying why.
- [x] Add the `shellcheck` hook from `https://github.com/shellcheck-py/shellcheck-py` at `v0.11.0.1`, which installs its own ShellCheck, so nobody needs it on their machine.
- [x] Confirm that the hook sees every script. pre-commit recognises a file with no extension as shell only when it is executable and starts with a shell shebang. The reviewed classifier inventory and actual configured hook cover all 36 current tracked scripts and Bats files in `s/` and `.githooks/`, including the merged Terraform tooling. A copied executable script with no extension and spaces in its filename fails for an unquoted expansion (SC2086), then passes when quoted. Existing Bats process-isolation directives remain narrow and explained; no new suppression was needed.

## Phase 8: floors under every check

Added on 19 November 2026. A check that looks in the wrong place, or is given nothing to check, still passes. A Bandit hook given `r` where `-r` was meant scans no lines; a mypy hook that runs where it finds no config never applies `strict`; and pytest silently skips a test file whose name it does not collect. A floor catches each: it reads how much the tool says it checked and fails below a minimum. Turva has none of those faults today, checked on 18 November 2026, but nothing would notice one arriving. Two branches, because the hooks and the test suites fail in different ways and are checked in different places.

### Phase 8a: floors and reach checks for the hooks

Branch `feature/pre-commit-hook-floors`.

- [x] **A floor for each hook whose tool reports a count**, read from the hook's own output through `pre-commit run <id> --all-files --verbose`, so the hook is checked exactly as it is configured, wrong arguments included:
  - **bandit:** "Total lines of code", and a failure if "Files skipped" is above 0. Bandit leaves out a file written for a newer Python than it runs on, while the line count can stay above its floor.
  - **mypy:** the number in "no issues found in N source files".
  - **cspell:** "Files checked".
  - **Zizmor:** the number of files it reports auditing.
  - **check-dev-details:** our own script, so it gains a line saying how many files it checked.
- [x] **A reach check for every hook**, including those that print nothing when they pass: ruff, Prettier, markdownlint, ShellCheck and the `pre-commit-hooks` checks. It asks pre-commit which tracked files each hook would receive, and fails when one that the hook should cover is missing. Each rule is written against the real file list, not a number, so it never goes stale. For example: ruff and bandit receive every non-test `.py` file under `app/`, `safety_file/` and `demo/`; ShellCheck receives every file in `s/` and `.githooks/` with a shell shebang, which also catches a script missing its executable bit; Zizmor receives every file in `.github/workflows/`.
- [x] Put the scripts in `s/floors/`, with bats tests that stand in for each tool, so that every floor is shown to fail below its minimum.
- [x] Keep every floor, for the hooks and the test suites, in one file, `s/floors/minimums`, one line per check, each set at 90% of the count measured when this phase is built, with a comment saying when. One file gives the update recipe one place to rewrite.
- [x] **Make the floors a ratchet.** Each check fails when its count falls below the floor. When the floor has fallen below 70% of the count, it is stale: `s/floors/check --raise`, which `./s/lint`, `./s/test` and `./s/frontend` pass on a full run, raises it to 90% of today's count, ready to commit with the work. Without `--raise`, as in CI, a stale floor is only reported. A floor is never lowered automatically.
- [x] Add a `floors-update` recipe to `justfile`, calling a script in `s/floors/`, which measures every count and rewrites `s/floors/minimums` to 90% of each. Give it a bats test.
- [x] Run both as a `Check the hooks' floors and reach` step after `Run pre-commit` in the `Styling (pre-commit)` job in `ci.yml`, which has every hook installed already. Their bats tests go flat in `s/tests/`, where `bats s/tests` finds them once #105 runs it in CI.
- [x] Built on 19 November 2026. The first floors, in `s/floors/minimums`: Bandit 5,597 lines (of 6,219), mypy 18 files (of 21), cspell 44 (of 49), Zizmor 4 (of 5) and the dev-details check 410 (of 456, the test files being exempt), measured after rebasing onto `main`. The reach check has 17 rules over 575 tracked files. Pointing bandit's `files:` at a wrong folder dropped it to 1,826 lines, below its floor, and the reach check named each file bandit missed; taking the executable bit off `s/lint` made the reach check report that ShellCheck no longer received it.

### Phase 8b: floors for the test suites

Branch `feature/pre-commit-test-floors`.

- [ ] **A floor on the number of tests each suite collects**, kept in `s/floors/minimums` and ratcheted as in Phase 8a, checked on a full run only, in CI and in `./s/test` or `./s/frontend` with no path: the `safety_file` suite (161 on 18 November 2026), the Django suite (485) and the frontend's Vitest suite. A suite that collects fewer tests still passes, so the count is what shows a test went missing.
- [ ] Open an issue for the bats floor, to be added once #105 has merged and its `Script tests (bats)` job runs `bats s/tests` in CI.
- [ ] **A test that fails on a test file pytest would never collect**. It reads the syntax tree of every Python file under `app/`, `safety_file/` and `demo/`, and fails on one that defines a test and has a name pytest does not collect. None does today.
- [ ] Prove each floor and the naming test fail, by planting a missing test or a misnamed file, then removing it.

## Decisions

- **One branch for each check.** Each check can fail the existing code in its own way, and a reviewer can judge one check's findings and exceptions in twenty minutes. Five checks in one pull request would hide one check's exceptions among another's.
- **Script tests run in the shared gate.** The merged Terraform stack added `bats s/tests` to `./s/test` and CI. Bats uses stand-ins for external services on the host/runner; no application container or personal task runner is needed for those tests.
