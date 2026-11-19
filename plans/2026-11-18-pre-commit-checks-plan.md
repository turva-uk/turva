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

- **Scope:** hook floors measure reported lines/files; reach checks verify routing and explicit policies. These complement real fault/canary tests and do not prove arbitrary scanner execution. Phase 8b adds storage, Django, unit Vitest and host Bats collection floors; Node tooling and browser execution remain separate gates.
- **Thresholds:** a count below its recorded floor fails. A floor below 70% of the measured count is stale; a successful local full run may raise it to at least 90%. CI reports staleness without changing source.
- **Publication:** validate the entire expected measurement scope and every existing floor before one atomic, monotonic update. Missing, duplicate or malformed counts fail. Producer and reach failures leave all floors unchanged. No command lowers a floor; any reduction needs a separate justified review.
- **Compatibility:** use pre-commit's own classifier rather than copying its matching logic. This is an internal API and fails visibly if incompatible. CI currently permits `pre-commit>=3,<5`; it is not an exact pin.
- **Shared entry points:** `./s/floors/refresh`, optionally `just floors-update`, captures complete successful measurements before publishing. Hook checks run after pre-commit in the existing styling job. Script tests are flat in `s/tests/` and already run on the host and in CI through the merged Terraform work.
- **Partial tests:** full-suite floors must not be applied to deliberately filtered runs. Add the Bats count alongside the other suite counts in Phase 8b, now its runner is established.

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

Added on 19 November 2026. Count floors detect unexpected losses of reported scope, and explicit policies detect missing routing. They supplement, rather than replace, the complete-report Bandit guard, real fault probes and Gitleaks canaries. Hook checks and test-suite checks land separately because their reports and execution surfaces differ.

### Phase 8a: floors and reach checks for the hooks

Branch `feature/pre-commit-hook-floors`.

- [x] **A floor for each hook whose tool reports a count**, read from the hook's own output through `pre-commit run <id> --all-files --verbose`, so the hook is checked exactly as it is configured, wrong arguments included:
  - **bandit:** "Total lines of code", and a failure if "Files skipped" is above 0. Bandit leaves out a file written for a newer Python than it runs on, while the line count can stay above its floor.
  - **mypy:** the number in "no issues found in N source files".
  - **cspell:** "Files checked".
  - **Zizmor:** the number of files it reports auditing.
  - **check-dev-details:** our own script, so it gains a line saying how many files it checked.
- [x] **An explicit policy for every configured hook**, including Terraform formatting and filename-free Gitleaks. The latter checks all-file trigger candidates plus its reviewed native staged entry, not imaginary filename-based scan coverage. Unknown/duplicate hooks and incomplete inventories fail. The separate frontend npm/CI surface retains types, lint, format, tooling/unit tests and builds, backed by its existing real tooling regressions.
- [x] Put the scripts in `s/floors/`, with bats tests that stand in for each tool, so that every floor is shown to fail below its minimum.
- [x] Keep every floor, for the hooks and the test suites, in one file, `s/floors/minimums`, one line per check, each set at 90% of the count measured when this phase is built, with a comment saying when. One file gives the update recipe one place to rewrite.
- [x] **Make floors a complete transaction.** A bounded shared parser rejects invalid/duplicate floor and count records and checks all expected keys before publication. A same-directory replacement preserves permissions and serialises cooperating updates through a directory lock. Later failures, failed replacement and concurrent writers have regression tests. Unterminated final records are inspected, not silently dropped. Existing floors never decrease.
- [x] Keep `just floors-update` as a thin optional alias to `s/floors/refresh`. Every first-party producer is captured successfully before a mutating consumer is invoked; a pipeline's EOF alone cannot convey producer failure. A failed reach check prevents a floor raise too.
- [x] Run both as a `Check the hooks' floors and reach` step after `Run pre-commit` in the styling job. `./s/lint` requests a ratchet only outside CI. Bats regressions run through the established host/runner script gate.
- [x] Review evidence on 19 November 2026: native reports cover 6,219 Bandit lines, 21 mypy sources, 50 cspell files, five unique Zizmor completions and 578 pattern/literal-checked text files under the documented privacy scope. The classifier validates 19 policies over 752 then-tracked files. Isolated actual-classifier probes reject narrowed Bandit/Terraform routing, a changed Gitleaks entry policy and a missing script executable bit. Original baseline floors are retained or raised, never lowered.

### Phase 8b: floors for the test suites

Branch `feature/pre-commit-test-floors`.

- [x] **Floors on collected tests**, checked after successful full runs: storage pytest, Django pytest, explicitly selected unit Vitest and host Bats. Local full runners may ratchet stale floors; CI remains read-only. Filtered runs retain their arguments without full-suite floors.
- [x] Add the Bats floor now its host/CI runner is established. Existing #126 records that follow-up; it is not closed automatically by this review. Count it with `bats --count s/tests`, without containers or automatic installation.
- [x] **Use active pytest naming settings**, not a guessed fallback. The AST check reads pytest's actual file/function/class settings and covers ordinary top-level functions and async methods. Dynamic test construction is outside this policy. Real pytest probes reject a misnamed async test and pass after correcting its filename; custom-pattern regressions also pass. Compose already mounts `pyproject.toml`.
- [x] **Require complete report evidence.** Buffer all requested producers, validate suite identities before collection, reject duplicate/filtered pytest summaries and malformed/duplicate Vitest identities, and pass the complete expected key set to the atomic floor boundary. The canonical refresh captures every hook/suite producer and reach before one update. A later failure cannot leave earlier increases behind.
- [x] **Separate frontend scopes.** Native unit collection has 1,139 unique project/file/name/location records, distinct from 1,358 parameter-expanded executed cases. Invoke installed Vitest through Node with `--project=unit`, never an implicitly installing `npx` call. Explicit Storybook browser-list probes show generated registrations without reliable source locations and counts unlike executed cases; retain their independent light/dark/canary execution gate, not an inflated unit or browser floor.
- [x] **Refresh from native evidence.** The complete hook/suite/reach refresh measures 161 storage tests, 524 Django tests, 1,139 unit records and 278 script tests. It retains existing floors or raises them, with suite floors 144/471/1,025/250 and privacy 524 from 583 checked text files. No floor decreases; the owned validation backend is stopped afterwards with named volumes retained.

## Phase 9: workflow syntax and embedded shell

Branch `feature/pre-commit-actionlint`.

The reviewed actionlint-py v1.7.12.25 hook supplies upstream actionlint 1.7.12. Its build checks versioned upstream archives against pinned checksums. The community wrapper and actionlint are MIT; the separately installed ShellCheck is GPLv3. This isolated tooling dependency adds no application runtime package.

- [x] Add actionlint and the twentieth explicit reach policy for all workflows. Retain current main's privacy, floor, pin-parser, frontend and security boundaries when reconciling the older stack.
- [x] Declare ShellCheck 0.11.0.1 in that environment and enforce alignment with the standalone hook through a script test. The checked entry refuses absent tools and policy-lowering arguments before scanning, installs nothing and supplies ShellCheck's resolved path explicitly.
- [x] Exercise the real configured hook: all tracked workflows and a clean synthetic workflow pass; an unknown expression property and an unquoted shell expansion fail with the expected expression/SC2086 findings. The copied-entry tests also cover missing tools, literal filename forwarding, absent scope, policy flags, tool statuses and pin alignment. Matcher inventories remain routing evidence, not scanner execution. These tooling changes do not alter risk calculation, evidence attribution, permissions or AI content; no `SAFETY.md` change is needed.

## Deferred: shell in Just recipes

The source proposal also records moving substantial recipe logic into tested `s/` entry points, leaving thin Just aliases. Keep this as separately reviewed work; adopting actionlint does not authorise an unrelated task-runner rewrite.

## Decisions

- **One branch for each check.** Each check can fail the existing code in its own way, and a reviewer can judge one check's findings and exceptions in twenty minutes. Five checks in one pull request would hide one check's exceptions among another's.
- **Script tests run in the shared gate.** The merged Terraform stack added `bats s/tests` to `./s/test` and CI. Bats uses stand-ins for external services on the host/runner; no application container or personal task runner is needed for those tests.
