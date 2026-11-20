# Try Turva locally

<!-- cspell:ignore changepassword Pango -->

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

Looking at a hazard or filtering the log must not add a commit. Owners can now use the separate **Record hazard** and **Edit hazard** forms below. Readers of a published file cannot edit it; the API enforces that rule as well as the interface.

## Record and edit hazards

Use the new fictional safety file you created in the earlier walkthrough if you want to keep the prepared six-hazard BP@Home example unchanged. Sign in as that file's owner, not the new account from the registration walkthrough.

1. Open the file and choose **Record hazard**. Give it a fictional title, responsible email address, cause, effect on the care pathway and potential harm. The email records responsibility only: it sends no invitation and grants no access.
2. Leave the four assessment scores unselected and press **Save hazard**. Expect validation, no saved hazard, and your draft still present. No severity or likelihood defaults to a low score.
3. Choose initial severity **4 - Major**, likelihood **3 - Medium**, residual severity **4 - Major**, likelihood **1 - Very low**. The server-derived previews should show levels **4** and **2**, clearly marked **not saved**. Enter a fictional justification explaining the change; the interface does not validate whether a control works in reality.
4. Save the form. Expect **HAZ-001** (or the next unused identifier), a detail page with both assessments, and one attributable history entry. The repository's generated `docs/hazards/index.md` is updated in the same save. Editing fields or previewing risk alone must not create versions.
5. Choose **Edit hazard**, correct the title and save. The ID and creation date stay the same; the history includes the original version despite the filename changing. Linked mitigations remain unchanged by this form. Saving an unchanged form creates no extra version.
6. Try residual severity **5** while initial severity is **4**. Expect rejection without a version being added. Restore the original scores.
7. Change status to **Closed**, clear the justification and save. Expect rejection. Record **Fictional test pathway withdrawn - development testing only**, then save. Closure retains the hazard, scores and history; it is not approval to deploy. **Transferred** also retains the record and is not proof that someone else accepted responsibility.

### Check two open tabs

1. Open **Edit hazard** in two tabs before saving either one.
2. In the first tab change the cause and save.
3. In the second tab enter a different cause and save. Expect **This safety file changed after you opened it**, with the second draft retained. The recorded cause must remain the first tab's value.
4. Use **Open the latest recorded version in another tab** to compare without clearing the stale draft. Copy any wording you want to retain, then start a fresh edit from the latest version. Turva does not automatically merge clinical judgements or silently refresh the stale form's version. Any save elsewhere in the same file, including a new hazard, makes an older form stale.

Drafts are held in the open page only, not browser storage: closing or reloading discards them. After a connection failure, compare with the latest recorded version before retrying; a response can be lost after a successful save. Version preconditions prevent that retry from creating another hazard or overwriting later evidence.

### Repository failures

An unexpected uncommitted change blocks saves rather than attributing someone else's work to you. Detail screens also refuse to present dirty working-tree content as committed evidence. Ask an administrator to inspect the repository; do not run a reset or clean command to make the warning disappear. Failed writes are deliberately left for inspection. Automated tests cover dirty/staged trees, failed commits, lock contention and concurrent saves in temporary repositories, so you do not need to damage your demo to exercise these paths.

The locks cover participating Turva processes on the local Linux filesystem. They are not distributed locks and do not protect against an administrator bypassing Turva with direct filesystem or Git operations. See [ADR 0004](../specifications/adr/0004-serialised-safety-file-saves.md).

## Record mitigations and link hazards

Use your separate fictional test file, not the prepared BP@Home repository, if you want to keep the demonstration unchanged. No database migration or new dependency is needed for mitigation authoring; the running `./s/up` stack reloads source changes.

1. Open a hazard and choose **Record a mitigation for this hazard**, or choose **Record mitigation** from the file's mitigation list. A hazard-specific entry preselects that hazard, but saves nothing yet.
2. Enter **Fictional daily safety-netting**, a fictional responsible email address and a control type. The email records responsibility, not an invitation. Leave status **Proposed**, select one or more hazards and record a fictional narrative. Save once.
3. Expect the next `MIT-nnn` identifier and its detail page. Follow a linked hazard: the mitigation must appear there too. Both sides and the generated log were written in one commit attributed to you. The hazard's severity, likelihood and derived risks must be unchanged.
4. Edit the mitigation title. Its ID, creation date, evidence and links remain, and its history follows the rename. Save an unchanged form: no new audit entry should appear.
5. Choose **Implemented** or **Verified** without evidence and save. Expect rejection with the draft retained. Add a fictional test/report reference and save. This records your judgement, not Turva verifying a control or approving deployment.
6. Remove one hazard from **Linked hazards** and save. Check that the mitigation is also removed from that hazard's links, while the hazard, assessment, other controls and mitigation evidence remain. Withdrawing a mitigation retains its evidence and links; reassess any affected risk separately.
7. Open the same mitigation edit form in two tabs. Save from one, then try saving the other. The stale draft and its original version must stay in place, with a separate-tab comparison link. Do not refresh and silently retry a clinical judgement against a newer version.
8. At phone/tablet/desktop widths, inspect the mitigation list, long selected hazard labels and evidence paragraphs. Keyboard users can search/select hazards, save and follow links. Another verified account may read a public file but cannot create/edit its mitigations; private evidence is not disclosed.

New mitigation saves with implemented/verified status require evidence. Older version-1 records without evidence remain readable; supply an evidence statement before saving their mitigation form. Supplier provenance not yet understood by this version is refused, never silently removed. See [the port decisions](../specifications/quill-port.md) for the organisational/team/delegation work still to come.

## Organisations, CSO appointments and named file teams

Use fictional identities and a separate test file. These exercises do not alter the prepared BP@Home repository. Apply the new organisation/index migrations first:

```bash
./s/manage migrate
```

Provision an organisation **once**, using an existing verified account. This is an operator action, not a self-service claim based on an organisation name. Re-running it creates another independent organisation, even if the names match; retain the printed organisation reference and use the existing one for later exercises.

```bash
./s/manage provision_organisation \
  --name "Fictional Riverbank Federation" \
  --administrator a.patel@riverbank.example.nhs.uk
```

1. Sign in as the administrator, open **Organisations**, then the new organisation. It initially grants administration only, not a CSO appointment or evidence access. If this is your seeded fictional CSO, select **Appointed Clinical Safety Officer** on their membership and explicitly save their roles. Other accounts must first complete their own verified-email/profile declaration. Appointment does not verify registration or competence.
2. Prepare a second fictional account using the registration/confirmation walkthrough below, ideally in a separate private browser window. Complete its fictional CSO profile declaration. Do this **before** requesting the membership invitation, so its account-confirmation email does not replace the latest invitation in the console preview.
3. As administrator, use **Invite a member** with the second account's exact email. The console backend sends no real email. Run `./s/mail --open`, copy the complete invitation link into the second account's browser window, then choose **Accept invitation**. Acceptance requires the matching verified identity, expires after seven days and works once. It grants membership only; an invitation is not a file share or CSO appointment. A failed mail send is reported honestly, and another attempt must wait ten minutes.
4. As administrator, appoint the accepted member as a CSO and save deliberately. As that colleague, expect no access to the first person's private files merely because they joined the same organisation or were appointed. An ordinary member cannot change roles or send invitations. Removing the last active administrator is refused until another has been appointed.
5. As the owner, create a separate fictional file or open your existing disposable test file. Choose **Adopt into an organisation / name a file team**, deliberately select the organisation, name any eligible CSO collaborators and record a reason. Adoption names you as the first accountable CSO. Save once. The manifest upgrades from version 1 to version 2, and `.turva/team.yaml` is recorded in the same attributable commit. Hazards, mitigations, risk scores and narrative pages are unchanged.
6. The explicitly named colleague can now open that file, record/edit a fictional hazard or mitigation and see their own name/email in its history. Every selected collaborator can read/edit the **whole file**. Do not use this as a substitute for single-mitigation delegation, which remains R13. Unnamed CSOs, other practice/Federation memberships and administrator status alone confer no evidence access.
7. Keep a colleague's hazard edit form open with an unsaved draft, and build its PDF once. As administrator, remove their CSO appointment or membership, acknowledge the access consequence and save. Their next read/download, including the already cached PDF, must be refused. Saving the old form is refused with its entries retained. Already delivered copies cannot be retracted.
8. Reappoint that colleague. Access must **not** return automatically. In **Manage file team**, the outdated appointment is visibly unselected. Deliberately select the new appointment and save a new reason/team version to restore access. A form opened before an appointment change cannot silently bind its replacement; start a new team decision after comparing the retained draft.
9. Open two team-edit tabs. Save from one, or save a hazard elsewhere, then try saving the older team draft. Expect a conflict and retained choices/reason, with a latest-team comparison link opening another tab. Unchanged team saves create no new Git commit.
10. An organisation administrator can use **File-team administration** to name a replacement accountable CSO even if the previous appointment has expired. This inventory exposes titles and team records, not hazard/mitigation evidence. A collaborator cannot manage the team. There is exactly one recorded accountable CSO; if their appointment is revoked, the record remains historical and grants no access until a current replacement is explicitly named.
11. Create a separate fictional practice organisation if testing isolation. Matching names and Federation membership do not connect identities or grant inherited access. Organisation transfers are not supported by team editing. Existing owner-controlled files remain untouched until their owner explicitly adopts them.
12. Inspect the new screens at phone/tablet/desktop widths, with keyboard-only controls, reduced motion and 200% zoom. Long member names/emails, role-removal confirmations and invitation failures must stay readable. A version-2 PDF includes its recorded team as historical evidence, not proof that appointments remain valid today. Narrative pages may still name earlier personnel and require separate review; team saves never silently rewrite clinical prose.

React-only invitation links use `FRONTEND_BASE_URL`: by default `http://localhost:5173` in development, or `SITE_BASE_URL` outside DEBUG. Override it only if your React application is served elsewhere. Production React routing remains a separate deployment gate. `./s/mail` previews both multipart account emails and plain-text invitations, decoding MIME wrapping without printing bearer links. Never publish or share the private preview.

The index can be repaired with `./s/manage reindex_safety_files`, but recovery never creates live memberships or appointments from Git. For an orphan managed file, `--owner` assigns an operational custodian only, not evidence authority. Back up the operational PostgreSQL state as well as the evidence repositories. See [ADR 0006](../specifications/adr/0006-named-file-teams-and-live-appointments.md) for ordering, recovery and limits.

## Read the safety documents

1. Sign in as the seeded CSO and open **BP@Home remote blood pressure monitoring** in React. Under **Safety documents**, open the **Overview**, **Clinical risk management plan**, **Hazard log** and **Clinical safety case report**. Each page is read-only and names the committed path, the commit it was read at and the last change to that document with its author.
2. In the hazard log, the summary must show **six hazards** and **seven mitigations**, the residual-risk status notice must stand out, and both initial and residual derived assessments must remain readable. On a phone-width window the wide tables scroll inside their own focusable region rather than widening the page; with the keyboard, Tab to a table and use the arrow keys to scroll it. Links between documents (for example from the overview's contents) open the other document in Turva; external links are marked as such.
3. Only these four documents can be read. Any other key in the address bar, such as `/safety-files/demo-bp-at-home/documents/mkdocs`, reports that the document does not exist, and nothing else in the repository is reachable this way. Another account, an organisation administrator without a named team grant, or a CSO whose appointment was removed gets the same not-found answer as for the safety file itself.
4. Unsupported resources in an otherwise supported document have visible placeholders and an omission count. If formatting cannot be represented without changing meaning, expect **Formatted view unavailable** and the exact **Committed Markdown source** as escaped, read-only text instead of a misleading formatted view. In a disposable fictional file, a committed `<span style="text-decoration:line-through">Approved for deployment</span>` must remain visibly marked-up source, never ordinary approval text. Markup in that source region must not execute, load images or style the page. Missing, oversized, non-text or stale generated hazard logs remain unavailable without a source fallback.
5. Tab through document links and any table/source regions; check visible focus and arrow-key scrolling. Inspect phone, tablet and desktop widths, reduced motion and 200% zoom. The full source commit, attribution, warnings and document text must remain readable without widening the page. Reading is not authoring or clinical approval.
6. In your separate fictional test file, commit a document containing an image, a `<script>` block or a `javascript:` link outside Turva. The page shows **Some content is not shown** and marks each item where it occurs; nothing is executed or fetched. An uncommitted edit makes the page refuse to show evidence until an administrator inspects it, and a committed hazard log that disagrees with the recorded hazards is withheld with an explanation rather than shown.

## Download a draft safety file

The PDF feature adds native fonts/Pango and Python rendering dependencies to the web image. Rebuild after pulling this feature (keep your alternative port variable set if using one):

```bash
./s/up --build -d
```

1. Sign in as the seeded CSO and open **BP@Home remote blood pressure monitoring** in React. Choose **Download draft safety file (PDF)**. The button shows progress while the first build runs, then reports that the file is prepared; check your browser's downloads.
2. Open the PDF. The cover must show **DRAFT**, the full source version, the last commit's author/date, and a controlled contents list. Its filename contains the source version's first eight characters. This is not clinical safety approval or a completed DCB0160 safety case.
3. Check the overview, clinical risk management plan, hazard log and safety case report, then the explicit appendices. The prepared demo has **six hazard narratives** and **seven mitigation-evidence sections**. Both initial and residual assessments must remain readable in the printed tables. Recorded Markdown narratives are shown as text, not interpreted HTML.
4. Download it again without saving changes. The content should be identical; the cached build avoids rerunning the engines. In browser developer tools the response has `X-Turva-Source-Commit` and `X-Turva-PDF-Cache: hit`. Private PDFs are not exposed as public static files.
5. In your separate fictional test file, open two detail tabs, edit a hazard from one, then download from the older detail tab. Expect a visible **changed after the page opened** error, not a PDF silently labelled with a different version. Reload the detail page, then download the newer version. A save during a build does not alter the captured PDF: its cover still names the version that was captured.
6. Another account cannot download a private file, even if the owner already built and cached it. Unverified accounts cannot download safety evidence. DCB0129 output is not supported and is not offered as a DCB0160 download.

The current controlled text scope is the four named documents, every recorded hazard's additional narrative, every mitigation's fields/evidence/narrative, and the named team at the source version for explicitly adopted files. New arbitrary repository pages are **not** automatically included. Attachments remain source references, not embedded files. Embedded images/media, active HTML or unsupported markup block the export rather than silently disappearing. Resolve unsupported content with an administrator; do not treat a failed export as a blank or complete safety case.

The build uses a committed, clean snapshot and never edits the safety-file repository. Derived PDFs are cached outside it in the web container's `.turva-data/pdf-cache/`; that directory is disposable and is not safety evidence. Cache identity also includes exporter/CSS/scope and dependency versions. Rebuilding the container may discard the cache, not the repositories. The runtime build is bounded (30 seconds for Zensical, 90 seconds overall, 60 CPU seconds and 2 GiB virtual memory per renderer); synchronous rendering and production capacity still need operational review. See [ADR 0005](../specifications/adr/0005-controlled-pdf-exports.md).

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

Supplier document extraction, guided workflow, document editing and delegated mitigation remain roadmap work; the four safety documents are read-only in React. Organisational appointments and named whole-file CSO collaboration are available in React; they are not professional verification, formal sign-off or scoped delegation. The PDF is a controlled draft text export, not an all-format attachment archive or a completed safety case. Production serving/routing for the built React application and general login/reset rate limiting are not complete. The responsive hazard/mitigation work applies to React, not the interim Django tables. Do not mistake the demo's prepared content for those features being complete. See [the roadmap](../specifications/roadmap.md) and [funded scope](../specifications/phase-one-scope.md).
