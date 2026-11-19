# Pre-commit checks plan

Turva's `.pre-commit-config.yaml` checks formatting, spelling, Markdown and Python style, and since #109 and #110 it runs on every commit as well as in CI. It does not look for the mistakes that hurt most in a public, safety-critical repository: a committed secret, a home network address or device name, an unsafe GitHub Actions workflow, a Python type error, or a known-insecure Python pattern. Each has a well-tried pre-commit hook, so Turva can adopt checks that are known to work rather than design them afresh.

This plan adds those checks one at a time, each as its own branch in the `pre-commit` stack on top of `feature/pre-commit-lint-staged` (#110): `check-toml`, gitleaks, the dev-details check, Zizmor as a hook, mypy, bandit and ShellCheck, then floors under every check so that none can pass while checking nothing, then actionlint for the workflows and the shell inside them. Each phase lands green: where a new check finds problems in the existing code, the phase either fixes them or narrows the check's scope, and says which in its pull request. The order puts the cheapest and most valuable checks first, so stopping early still leaves Turva better protected.

## Open questions

- [x] **What happens if gitleaks finds a secret in Git history?** Phase 2 scans the whole history once. Rewriting `main`'s history needs a force-push, which `AGENTS.md` lists as needing approval. - Report it, stop for you to rotate the secret, then add the commit to the allowlist with a reason. History is never rewritten. Answered in `/t-g`, 18 November 2026.
- [x] **Does CI keep its own online Zizmor run once the hook exists?** The hook runs with `--offline`, because the audits that ask GitHub need a token. - Yes: the `Workflow security` job keeps running Zizmor online, but reads its version from `.pre-commit-config.yaml`, so there is one pin. Answered in `/t-g`, 18 November 2026.
- [x] **What does mypy check first, and how strictly?** `safety_file/` imports no web framework, so it can be checked without Django's stubs, and strictly. `app/` needs `django-stubs` and `djangorestframework-stubs` and will report far more. - `safety_file/` only, strict, in Phase 5. `app/` waits for a later plan, informed by a first count of its errors. Answered in `/t-g`, 18 November 2026.
- [x] **Does bandit scan the tests?** Bandit reports every `assert` (B101), and pytest tests are built from them. - No: it scans `app/`, `safety_file/` and `demo/`, and excludes the test files, so B101 stays on for application code. Answered in `/t-g`, 18 November 2026.
- [x] **Where does `check-toml` go?** Turva has two TOML files today, `pyproject.toml` and `ruff.toml`. The check is one line beside `check-yaml` and `check-json` in `.pre-commit-config.yaml`. - Its own small phase, Phase 1, before gitleaks. Answered in `/t-g`, 18 November 2026.
- [x] **When is the denylist written?** - Before the run, so Phase 3's first scan of the repository also catches the literals. Made in `/t-g`. Answered in `/t-g`, 18 November 2026.
- [x] **Do floors cover the hooks, the test suites or both?** A check can pass while checking nothing: a Bandit hook given a wrong argument scans no lines, a mypy hook that finds no config never applies `strict`, and pytest never runs a test file it does not collect. - Both: every pre-commit hook and every test suite, in Phase 8. Answered 19 November 2026.
- [x] **How is each floor set?** The alternative was to fail on any drop at all, which also fails when a test is deleted on purpose. - About 90% of the count measured when Phase 8 is built, written beside a comment saying when and from what, and raised by hand as the code grows. Answered in `/t-g`, 19 November 2026.
- [x] **May the reach check use pre-commit's own internal code?** Asking pre-commit which files each hook receives means importing `pre_commit.commands.run.Classifier`, which is not a published interface, so a pre-commit upgrade could break it. The check then fails loudly instead of passing, and the pre-commit version is pinned. The alternative is to copy pre-commit's matching rules into the script, which can drift from the real ones without anything noticing. - Yes: it imports pre-commit's own matching code, and fails loudly if an upgrade changes it. Answered in `/t-g`, 19 November 2026.
- [x] **What happens to the bats floor while bats does not run in CI?** The 66 bats tests, and the floors' own bats tests, only run in CI once #105 adds its `Script tests (bats)` job. - Phase 8 floors pytest and Vitest now, and an issue records adding the bats floor once #105 has merged. Answered in `/t-g`, 19 November 2026.
- [x] **How do the floors keep up as the code grows?** A reminder in a passing CI job gets ignored, and a weekly job opening its own pull request needs a token that can write to the repository. - A ratchet: the check also fails when a floor has fallen below 70% of the count it measures, which happens after about 29% growth since the floor was set at 90%. Its message says to run `just floors-update`, which rewrites every floor to 90% of today's count, committed in the same pull request. Answered 19 November 2026.
- [x] **Does a stale floor fail CI?** Failing a build because the code grew feels like a punishment, and a command nobody remembers to run gets dodged rather than run. - No: only a count below its floor fails. `./s/lint`, `./s/test` and `./s/frontend`, which run before every commit, raise a stale floor to 90% of today's count themselves, so the change is committed with the work. CI only reports a stale floor. `just floors-update` stays for resetting every floor on purpose. Answered 19 November 2026.
- [x] **Where do the floors' bats tests live?** Settled from the code: flat in `s/tests/`, because #105's job and `./s/test` run `bats s/tests`, which does not look in subfolders. Settled in `/t-g`, 19 November 2026.
- [x] **Do the hook floors get their own CI job?** Settled from the code: no, a step after `Run pre-commit` in the `Styling (pre-commit)` job, which has every hook already installed and cached. A job of its own would install them all again. Settled in `/t-g`, 19 November 2026.
- [x] **Does a test floor apply when only some tests are run?** Settled from the code: no. `./s/test` takes a path to run part of a suite, and a floor there would fail every partial run. The floor applies to a full run only: CI, and `./s/test` with no path. Settled in `/t-g`, 19 November 2026.
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

- [x] Add `s/checks/check-dev-details`, which refuses private network addresses and device MAC addresses in tracked files, plus the literals in a developer's own denylist, such as a hostname or a VPN network's name. It reports a match as `path:line` and the rule's name, never the matched text, because CI logs are as public as the files.
- [x] Name its private list `local/dev-details-denylist`, and add `/local/` to `.gitignore`. The script makes the file, with a header explaining it, the first time it runs outside CI in a clone that has none. CI runs only the patterns, never the list.
- [x] Add it to `.pre-commit-config.yaml` as a `local` hook over `types: [text]`.
- [x] Add `s/tests/check-dev-details.bats`, with every made-up address and name obviously fake.
- [x] Run it over every tracked file before turning it on. Remove any real detail it finds, and widen the patterns' exceptions only for a value that names nothing, such as a documentation address range. Ran on 18 November 2026: every tracked file passed, with the patterns and with the denylist, so nothing needed removing.

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
- [x] Give the hook the only two packages `safety_file/` needs beyond the standard library, `types-PyYAML` for `yaml` and `pytest` for its tests, as `additional_dependencies` pinned to the versions in `app/requirements*.txt`. An unpinned package takes whatever PyPI has newest, and fails on typing that the locked version does not share.
- [x] Leave `app/` unchecked, and open an issue for a later plan that records how many errors a first non-strict run over `app/` reports, with `django-stubs` and `djangorestframework-stubs`. Opened as #118. Departed from the plan: the issue makes the count its first step, because counting needs Django and its stubs installed beside mypy, which the hook does not have.

## Phase 6: bandit

Branch `feature/pre-commit-bandit`.

- [x] Run bandit once over `app/`, `safety_file/` and `demo/`, using the hook's own copy through `pre-commit run bandit --all-files`, with the test files excluded, and triage what it reports. Fix a real finding. Mark a false one with bandit's skip comment and the rule's code, plus a comment saying why it is safe. Ran on 18 November 2026: 14 findings, all false. Six were B404, which flags every `import subprocess`, so the hook skips B404 and relies on B603 for each call. The other eight each got a skip comment with its reason.
- [x] Add the `bandit` hook from `https://github.com/PyCQA/bandit`, with `language_version: python3.14`, and its settings in a `[tool.bandit]` block in `pyproject.toml`. Departed from the plan: the settings went in the hook instead, because bandit ignores `exclude_dirs` for files that pre-commit names one by one.
- [x] Decide whether Turva needs a bandit wrapper that checks the scan really covered the code. Bandit silently skips a file it cannot parse, so add the wrapper if a file is skipped on the first run. Not needed: the first run skipped no files.
- [x] If a finding touches permissions, the audit trail or the risk matrix, update `SAFETY.md` in the same commit, as `AGENTS.md` requires.

## Phase 7: ShellCheck

Branch `feature/pre-commit-shellcheck`. Added on 18 November 2026, after the first six phases had landed. Turva runs ShellCheck as a hook, so it checks each script at commit time, and CI's `Styling (pre-commit)` job runs it on every file, so a commit made with `--no-verify` is still caught.

- [x] Run ShellCheck once over every shell file, using the hook's own copy through `pre-commit run shellcheck --all-files`, and triage what it reports. Ran on 18 November 2026: the 20 scripts in `s/` and `.githooks/` all passed. The findings were all in three bats tests: one `cd` without a fallback, fixed, and two kinds of false alarm, each turned off with a comment saying why.
- [x] Add the `shellcheck` hook from `https://github.com/shellcheck-py/shellcheck-py` at `v0.11.0.1`, which installs its own ShellCheck, so nobody needs it on their machine.
- [x] Confirm that the hook sees every script. pre-commit recognises a file with no extension as shell only when it is executable and starts with a shell shebang. Every script in `s/` and `.githooks/` is, and the bats tests are recognised by their `.bats` extension. No other shell scripts are tracked.

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

- [x] **A floor on the number of tests each suite collects**, kept in `s/floors/minimums` and ratcheted as in Phase 8a, checked on a full run only, in CI and in `./s/test` or `./s/frontend` with no path: the `safety_file` suite (161 on 18 November 2026), the Django suite (485) and the frontend's Vitest suite. A suite that collects fewer tests still passes, so the count is what shows a test went missing.
- [x] Open an issue for the bats floor, to be added once #105 has merged and its `Script tests (bats)` job runs `bats s/tests` in CI. Opened as #126.
- [x] **A test that fails on a test file pytest would never collect**. It reads the syntax tree of every Python file under `app/`, `safety_file/` and `demo/`, and fails on one that defines a test and has a name pytest does not collect. None does today.
- [x] Prove each floor and the naming test fail, by planting a missing test or a misnamed file, then removing it.
- [x] Built on 19 November 2026. `s/floors/test-counts` collects each suite without running it, where it runs: 161 `safety_file` tests, 488 Django tests (485 and the naming test's 3) and 721 Vitest tests. Vitest lists 721 although a run reports 804, because some tests expand into several cases only when they run, so the floor is on the list, which is stable and needs no second run. The floors are 144, 439 and 648. The naming test lives in `app/config/tests/test_test_file_names.py`, because the container mounts `app/`, `safety_file/` and `demo/` together. Planting a misnamed `planted_checks.py` made it fail, and removing it made it pass.

## Phase 9: actionlint

Branch `feature/pre-commit-actionlint`. Added on 19 November 2026. ShellCheck checks whole files only, so the shell inside each workflow's `run:` steps, over 70 lines in `ci.yml` alone, is never checked. actionlint reads each workflow, runs ShellCheck over every `run:` step, and also catches workflow mistakes nothing checks today: a typo in a `${{ }}` expression, a step reading an output that does not exist, or a `needs:` naming a job that is not defined. Zizmor looks only for security problems, so the two overlap very little.

- [x] Add the `actionlint` hook from `https://github.com/Mateusz-Grzelinski/actionlint-py`, at the latest tag confirmed from that repository at build time (`v1.7.12.25` on 19 November 2026, which installs actionlint 1.7.12), with `shellcheck-py` pinned to the same version as the ShellCheck hook in its `additional_dependencies`. Chosen over the official hook in actionlint's own repository, which builds actionlint from source with Go and finds ShellCheck only if it is already installed on the machine. actionlint skips its ShellCheck rules silently when ShellCheck is missing, so the official hook would pass the shell unchecked on any machine without it, CI included.
- [x] Run it once over every workflow, using the hook's own copy through `pre-commit run actionlint --all-files`, and triage what it reports. Fix a real finding. Turn off a false one only with a reason, in an `.github/actionlint.yaml` that records each exception. Ran on 19 November 2026: all three workflows passed, so no exception file was needed.
- [x] Prove that the ShellCheck rules really run: plant an unquoted variable in a `run:` step, see the hook report it as a ShellCheck finding, then remove it. Without this a missing ShellCheck would look exactly like clean shell. Done on 19 November 2026: an unquoted `$UNQUOTED_PLANT` in the `safety_file` test step of `ci.yml` was reported as ShellCheck's SC2086, then removed.
- [x] Add a rule to `s/floors/reach.py` that actionlint receives every file in `.github/workflows/`, with its bats test, and reset the floors with `just floors-update` if any count moves. The reach check now has 18 rules, and no floor moved.
- [x] Note in the hook's comment that Dependabot bumps the hook's `rev` but not the `shellcheck-py` pin inside it, so the two ShellCheck pins move together by hand.

## Phase 10: shell in the justfile

Added on 19 November 2026. No tool checks the shell inside `justfile` recipes, and a handful hold real logic, with `if`, `case` and `$(...)`, the longest running to about 30 lines each. Moving each long recipe into a script under `s/<topic>/`, with the recipe calling it, puts that shell where ShellCheck, the reach check and bats tests already cover it, with no new tool. Not part of the `pre-commit` stack: it changes no check, only where code lives.

- [ ] List the recipes holding more than a few lines of shell, and move each into a script under `s/<topic>/`, with a bats test.
- [ ] Leave each recipe as a one-line call to its script, so `just` keeps working as it does today.

## Decisions

- **One branch for each check.** Each check can fail the existing code in its own way, and a reviewer can judge one check's findings and exceptions in twenty minutes. Five checks in one pull request would hide one check's exceptions among another's.
- **The bats tests still need #105 to run automatically.** `./s/test` runs `bats s/tests` only once the Terraform stack (#105) merges. Until then each phase's bats test runs by hand, and its pull request says so.
