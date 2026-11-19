# Convenience Scripts

One script per repeated process. Each one `cd`s to the repository root first, so they work from any directory, and forwards extra arguments to the underlying tool:

```bash
./s/up --build         # rebuild images before starting
./s/logs web           # follow logs for one service
./s/test -k login      # run matching tests
```

## Running the stack

### `./s/up`

**The primary way to run Turva locally.** Starts all services with Docker Compose, waits for the health checks to pass, opens the application in your browser, then attaches so you see the logs; Ctrl-C stops it.

```bash
./s/up                 # start everything and open the browser
./s/up --build         # rebuild images first
./s/up -d              # detached
./s/up --no-browser    # leave the browser alone
./s/up web             # one service and its dependencies
```

The browser opens on <http://localhost:5173>, the React interface. Django is at <http://localhost:8000> - the API, the admin, and the interim server-rendered screens - and Caddy at <https://localhost>, with a certificate from its own internal CA, so expect a browser warning there unless you have trusted it. Set `TURVA_URL` to open somewhere else, or `TURVA_NO_BROWSER` to never open one.

Opening is skipped when there is no display, when `CI` is set, and when the services you named include neither `frontend` nor `web`.

### `./s/down`

Stops the stack, leaving volumes and data intact.

### `./s/restart`

Restarts all services, or one named service.

### `./s/logs`

Follows logs for all services, or one named service.

### `./s/mail`

Decodes the latest account email from the local console backend into `.private/mail/latest.html`, without printing its account link. Refuses a non-DEBUG or non-console stack. The preview may contain a bearer link: do not share it.

```bash
./s/mail --open          # preview the latest development email in a browser
./s/mail --since 2h      # include older messages
```

See [the demo testing walkthrough](../demo/README.md) for registration, confirmation and password reset testing without a real mailbox.

### `./s/clean`

Removes this project's containers and volumes. **Destroys the local database**, so migrations need re-running afterwards.

Scoped to this project. Pass `--system` to additionally prune Docker artefacts machine-wide, which prompts for confirmation because it affects every project on the machine.

Safety file repositories under `.turva-data/` are deliberately left alone: they are the data, not disposable state. Rebuild the demo with `./s/seed-demo --force`.

## Development

### `./s/test`

Runs the test suites. There are three, because they need different environments:

| Suite          | Environment                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `safety_file/` | pure Python, no database or container. Runs on the host in about two seconds |
| `s/tests/`     | bats tests for the `s/` scripts. Run on the host and need `bats`             |
| `app/`         | needs PostgreSQL and the application container                               |

```bash
./s/test                       # all three suites
./s/test safety_file           # host suite only
./s/test safety_file -k risk   # host suite, filtered
./s/test s/tests               # script tests only
./s/test -k login              # container suite, filtered
```

An argument naming the `safety_file` package or `s/tests` routes to the host; anything else goes to the container.

### `./s/lint`

Runs every check CI enforces: `pre-commit run --all-files`, then the Zizmor GitHub Actions audit. Run before committing.

### `./s/frontend`

Runs an npm script in `frontend/`, from anywhere in the repository. With no arguments it runs the whole gate CI runs, in CI's order.

```bash
./s/frontend              # typecheck, lint, format check, tests, build
./s/frontend typecheck    # or one step
./s/frontend test
./s/frontend test-storybook:ci # browser stories in light/dark, plus gate canaries
```

Installs dependencies first if `node_modules` is missing. Needs Node 26 or newer on the host; the dev server itself runs in Docker as part of `./s/up`.

Storybook browser tests use the supported Vitest addon and the same WCAG 2.2 AA rules as the preview. Install Chromium once with `cd frontend && npx playwright install --with-deps chromium`. `./s/frontend test-storybook:ci` (also `just sbt`) runs without building or serving Storybook and needs no fixed port. Separate light/dark projects replay the interactions in each scheme; stories that explicitly pin a scheme retain it. The gate requires a valid accessibility report and fails on missing results or axe execution errors. Browser canaries verify clean scans, contrast failures, engine errors and skipped scans. Unit tests keep their jsdom setup in a separate project.

### `./s/lock`

Regenerates the pinned dependency locks from the `.in` declarations, for both `app/` and `docs/`. Run after editing any `requirements*.in`, and commit the `.in` and `.txt` changes together.

### `./s/manage`

Runs a Django management command in the application container. Works whether or not the stack is already running.

```bash
./s/manage migrate
./s/manage makemigrations accounts
./s/manage createsuperuser
./s/manage shell
```

### `./s/psql`

Opens a `psql` session against the development database.

```bash
./s/psql                       # interactive
./s/psql -c 'select 1'         # one-off query
```

The database is only an index over the safety file repositories and is rebuildable from them, but it is still the wrong place to make changes by hand.

### `./s/docs`

Serves the documentation site with hot reload at <http://localhost:8001>.

### `./s/install-hooks`

Opts this clone into the tracked `.githooks/pre-commit`, which runs pre-commit on staged files. `just setup` is an optional alias. Run it deliberately once per clone; the local Git setting is shared by linked working trees and each branch supplies its own hook. It does not install packages, alter global Git configuration or replace an existing custom hooks path. Existing hook files are not deleted. CI remains the backstop when local hooks are not installed.

### `./s/terraform`

Runs Terraform for Turva's GitHub repository settings in `terraform/github/`, in a pinned container. The host needs Docker, `curl` and Python 3.10 or later. `plan` and `apply` use `GITHUB_TOKEN`, falling back to `gh auth token`; see [GitHub settings](../docs/docs/github-settings.md) for the local-state limitations and explicit administrative approval boundary.

```bash
./s/terraform init
./s/terraform validate  # configuration and provider schema, no GitHub access
./s/terraform plan      # reads GitHub and updates local imports, not settings
./s/terraform apply     # an admin, after the pull request merges
```

### `./s/seed-demo`

Builds the demo safety file into `.turva-data/safety-files/demo-bp-at-home`, then creates an account to sign in as and indexes the file so it appears in the interface.

```bash
./s/seed-demo                 # build, create the account, index the file
./s/seed-demo --force         # replace an existing demo, destroying its history
./s/seed-demo --build-only    # just the repository, no account, no database
```

The build goes through the production storage layer and imports no framework, so it doubles as an end-to-end check of that layer. The second step needs Django, and runs in the container.

The account is the demo's Clinical Safety Officer, `a.patel@riverbank.example.nhs.uk`, with the same name its commits are attributed to. Its password comes from `TURVA_DEMO_PASSWORD`, defaulting to `turva-demo-local`, and the command prints whichever it used. It is not a staff account unless you pass `--staff`: the admin is the only place a professional registration can be marked as verified, and a known-password account should not reach that without being asked for.

The seeding step refuses to run with `DEBUG` off. It creates an account whose password is written down here and gives it ownership of a safety file, which is right for a laptop and wrong everywhere else.

## Shared helpers

`s/utils/` holds internal helpers, not commands to type.

- **`s/utils/github-rulesets.py`** - validates and selects repository-owned ruleset identities for `s/terraform`. Its refusal paths are covered by `s/tests/terraform.bats`.

- **`s/utils/logging.sh`** - `log` and `error`, each printing the script's name in front, such as `[terraform] ERROR: ...`. Errors go to standard error, in red only in a terminal. Source it straight after the `set` line at the top, and always pass the name:

  ```bash
  source "$(dirname "${BASH_SOURCE[0]}")/utils/logging.sh" "<script-name>"
  ```

  Its tests are in `s/tests/logging.bats`.
