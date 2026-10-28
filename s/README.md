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

The browser opens on <http://localhost:8000>, Django directly. Caddy serves the same application at <https://localhost>, but with a certificate from its own internal CA, so unless you have told your browser to trust that CA it greets you with a security warning rather than the page. Set `TURVA_URL` to open somewhere else, or `TURVA_NO_BROWSER` to never open one.

Opening is skipped when there is no display, when `CI` is set, and when the services you named do not include `web`.

### `./s/down`

Stops the stack, leaving volumes and data intact.

### `./s/restart`

Restarts all services, or one named service.

### `./s/logs`

Follows logs for all services, or one named service.

### `./s/clean`

Removes this project's containers and volumes. **Destroys the local database**, so migrations need re-running afterwards.

Scoped to this project. Pass `--system` to additionally prune Docker artefacts machine-wide, which prompts for confirmation because it affects every project on the machine.

Safety file repositories under `.turva-data/` are deliberately left alone: they are the data, not disposable state. Rebuild the demo with `./s/seed-demo --force`.

## Development

### `./s/test`

Runs the test suites. There are two, because they need different environments:

| Suite          | Environment                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `safety_file/` | pure Python, no database or container. Runs on the host in about two seconds |
| `app/`         | needs PostgreSQL and the application container                               |

```bash
./s/test                       # both suites
./s/test safety_file           # host suite only
./s/test safety_file -k risk   # host suite, filtered
./s/test -k login              # container suite, filtered
```

An argument naming the `safety_file` package routes to the host; anything else goes to the container.

### `./s/lint`

Runs every check CI enforces: `pre-commit run --all-files`, then the Zizmor GitHub Actions audit. Run before committing.

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
