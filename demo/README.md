# Try Turva locally

<!-- cspell:ignore changepassword -->

Use fictional systems and identities only. Turva is pre-release and must not be used for a safety case an organisation will rely on. Do not enter patient data, credentials or unpublished real safety evidence.

## Get started

From the repository root, with Docker Engine and Docker Compose installed:

```bash
cp app/.env.example app/.env    # first checkout only; never overwrite your own .env
./s/up --build -d
./s/manage migrate
```

`s/up` opens <http://localhost:5173>. If another application uses port 8000, first run `export TURVA_WEB_PORT=8010`; the React URL stays the same. Keep that variable set in the shell you use to start or rebuild the stack. Django is then directly available on port 8010 instead of 8000.

Build the fictional BP@Home example. The builder runs on the host, so it needs Python, Git and the storage library's dependencies. With [uv](https://docs.astral.sh/uv/) installed:

```bash
uv venv                       # first checkout only
uv pip install -r safety_file/requirements.in pytest
./s/seed-demo
```

Sign in at <http://localhost:5173/login>:

- Email: `a.patel@riverbank.example.nhs.uk`
- Password: `turva-demo-local`

The seed command refuses to run with `DEBUG=false`. It creates a verified, non-staff demo account, a self-declared CSO profile, and a safety file with six hazards, seven mitigations and an attributable history. Nothing is sent to a real mailbox.

### Already have the demo?

Do not rebuild it just to reset the login:

```bash
./s/manage seed_demo
```

That resets the account to the default password and rebuilds the existing demo's index without rewriting its Git history. To choose another password interactively:

```bash
./s/manage changepassword a.patel@riverbank.example.nhs.uk
```

`./s/seed-demo --force` deliberately replaces the demo repository and destroys its previous history. Only use it when you want to discard your demo edits. It does not reset other safety files.

## Profile and new safety file walkthrough

1. Open **Your profile**. Check that the registration says **Not verified by Turva**, the CSO criteria are visible, and the declaration has a date.
2. Change the job role to **Lead Clinical Safety Officer**. Nothing saves until you press **Save profile**. Reload and confirm the change persisted without changing the original declaration date.
3. Try clearing the registration number while leaving the CSO role ticked, then save. Expect a validation error, no success notice, and no lost draft. Restore the fictional number `7654321` and save again.
4. Open **Safety files**, then **Create safety file**. The organisation is prefilled from your profile. Use **Demo - community BP review**, **DCB0160**, and intended use **Fictional remote blood pressure review by a federation clinical team. No patient data.**
5. Save. Expect the new detail page, an empty hazard-log warning and a first audit entry attributed to the signed-in person. An empty log is not evidence of safety.
6. Inspect the evidence on disk if useful:

   ```bash
   git -C .turva-data/safety-files/demo-community-bp-review log -1 --format=fuller
   ```

   The clinical risk management plan in that repository records the creator's profile as it was at creation. Later profile edits do not rewrite that evidence.

New files are private. DCB0129 is offered for compatibility with the interim Django interface, but currently uses the deployment template; the creation screen warns explicitly that it is not a DCB0129 document set.

## Review the demo hazards

1. Open **BP@Home remote blood pressure monitoring** from **Safety files**. You should see six hazards. Both initial and residual risk include the derived level and its meaning, not just a colour.
2. At a phone width (about 390px), each hazard becomes a labelled record. **Residual risk** must stay within the screen; no sideways scrolling is needed. The history and safety-file list use the same responsive layout.
3. Search for **stroke**, **HAZ-001**, or words in a cause or effect. Try **Closed** in the status filter: the prepared demo has no closed hazards, so it should say that no hazards match, not that the system is safe. Clear the search and select **All statuses** to restore the log.
4. Open a hazard by its title. Check its cause, effect, potential harm, risk justification, linked mitigation evidence and hazard-specific history. The narrative is shown as recorded Markdown text, not interpreted HTML.
5. Try a missing hazard at <http://localhost:5173/safety-files/demo-bp-at-home/hazards/HAZ-999>. Expect a clear not-found/access message. Viewing another account's private hazard returns the same message without disclosing whether it exists.

These screens are read-only. Looking at a hazard or filtering the log must not add a commit. The API rejects writes to the hazard-detail endpoint.

## Test registration, confirmation and password reset

First apply migrations after pulling, including the resend-attempt timestamp:

```bash
./s/manage migrate
```

For local email testing, set these non-secret values in your existing `app/.env` (do not replace the rest of that file):

```bash
DEBUG="true"
EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend"
SITE_BASE_URL="http://localhost:5173"
```

Run `./s/up -d` to apply changed environment values. The console backend does not send real mail. `SITE_BASE_URL` controls links in the API's account emails; older checkouts defaulted to `http://localhost`, which opens the interim Django screens through Caddy instead of React. Do not use production credentials for this walkthrough.

1. Sign out of the seeded account, choose **Create an account**, and use a new fictional address such as `tester@riverbank.example.nhs.uk`, fictional names and a strong test-only password. If you have already used that address, choose another.
2. Expect **Confirm your email address**. The account is signed in, but cannot access safety files yet. **Your profile** remains available. Try **Resend confirmation email** immediately: expect a ten-minute cooldown, not another email.
3. Preview the latest local account email:

   ```bash
   ./s/mail --open
   ```

   This decodes MIME wrapping so the complete link is clickable. It writes only to `.private/mail/latest.html` and prints the path, not the bearer token. It refuses to read a non-development/non-console stack. The preview can contain an account link: do not commit, publish or share it. Without `--open`, open the reported local file yourself. Use `./s/mail --since 2h` if the message is older than thirty minutes.

4. Follow the link and press **Confirm email address**. Opening the React page alone does not confirm the account. Return to **Safety files**; a new account starts with an empty list, not the seeded CSO's private demo.
5. Sign out, choose **Forgot your password?**, and enter the new address. Expect the same generic response that an unknown address gets. Run `./s/mail --open` again and follow the reset link.
6. Try mismatched passwords: expect validation and no change. Set a new strong password, then sign in with it. The previous password and previous sessions must no longer work. Reusing the reset link must fail.

The mail helper needs host Python 3 and the running stack. It is a local inspection tool, not a mailbox or mail delivery service. The interim Django routes remain available for compatibility; the API and React use the same Django forms and token generator.

## Automated checks

```bash
./s/test       # storage tests on the host, Django/API tests against container PostgreSQL
./s/frontend   # types, lint, formatting, component tests and production build; host Node 26+
./s/lint       # repo formatting, spelling and workflow security
```

The Python suite uses a separate test database and temporary safety-file repositories, not your demo evidence. Frontend component tests simulate failures as well as success: a failed save must retain the draft and must not show a success notice.

## Current limits

Hazard creation/editing, supplier document extraction, guided workflow, delegated mitigation and PDF export remain roadmap work. Production serving/routing for the built React application and general login/reset rate limiting are not complete. The responsive hazard-review work applies to React, not the interim Django tables. Do not mistake the demo's prepared content for those features being complete. See [the roadmap](../specifications/roadmap.md) and [funded scope](../specifications/phase-one-scope.md).
