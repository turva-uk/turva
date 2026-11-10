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

## Automated checks

```bash
./s/test       # storage tests on the host, Django/API tests against container PostgreSQL
./s/frontend   # types, lint, formatting, component tests and production build; host Node 26+
./s/lint       # repo formatting, spelling and workflow security
```

The Python suite uses a separate test database and temporary safety-file repositories, not your demo evidence. Frontend component tests simulate failures as well as success: a failed save must retain the draft and must not show a success notice.

## Current limits

Registration, email confirmation and password reset still have Django screens, not React replacements. Hazard creation/editing, supplier document extraction, guided workflow, delegated mitigation and PDF export remain roadmap work. The responsive hazard-review work applies to React, not the interim Django tables. Do not mistake the demo's prepared content for those features being complete. See [the roadmap](../specifications/roadmap.md) and [funded scope](../specifications/phase-one-scope.md).
