# View port plan

The Storybook port plan brought a catalogue of shared, tested components into `frontend/src/components/`, with their own theme in `frontend/src/theme.ts`. No page uses them yet. The app still renders every page with `frontend/src/legacyTheme.ts` and Mantine's own components, and borrows a handful of older home-made components: `SaveFailure`, `RiskLevel`, `HazardLog`, `MitigationList`, `HistoryTable` and `SafetyDocument`. So Turva has two looks, two themes and two form libraries (`@mantine/form` in the pages, `react-hook-form` in the components), and the accessibility checks the catalogue passes say nothing about the pages people actually use.

This plan moves the pages across. The theme switches first, in one pull request, because Mantine writes its CSS variables once at the root and the four shared stylesheets apply to the whole document, so a view cannot be moved inside a second provider. After that, each pull request moves one group of views onto the shared components, with nothing visual in between. The first phase deletes `legacyTheme.ts`, and the last deletes what is left of the old components and `@mantine/form`. No phase changes the API, the storage layer or a safety file.

## Open questions

- [x] **Does the app header become a shared component?** `App.tsx` builds the brand band, the main navigation and the sign-out button inline. The catalogue has no app header: the `MainLayout` the components were designed around was not ported. The simpler choice is a new `AppHeader` in `components/layouts/`, with a story, so the shell follows the same rule as the pages. - Yes: a new `AppHeader` in `components/layouts/`, with a story and a test. Answered in `/g`, 24 November 2026.
- [x] **What replaces `SaveFailure`?** It moves focus to the alert and says the draft has been kept, which is what ADR 0004 needs a stale save to tell the user. The catalogue has `FormStatus` and `PageMessage`, but neither is known to do both. Either one of them takes on the focus and the "kept" line, or `SaveFailure` moves into the catalogue with a story and a test. - `FormStatus` is extended: its error variants move focus to the alert, and a prop adds the line saying the entries have not been cleared. `SaveFailure` is deleted when its last page moves. Answered in `/g`, 24 November 2026.
- [x] **Do the page tests keep their assertions?** The simpler rule is that each phase changes a page test only where the markup really changed, such as a field's accessible name, and says so in its pull request, so each move reads as a refactor and a lost behaviour shows up as a failing test. - No: a phase may rewrite its page tests as the new components need. The behaviours each phase's check names, such as `expected_head` on every write, no `risk_level` in any request and a kept draft on a 409, must still be tested after the rewrite. Answered in `/g`, 24 November 2026.
- [x] **What happens to `SafetyDocument`?** `SafetyDocumentSheet` in the catalogue is for documents the API does not serve yet. The choice is between bringing `SafetyDocument` into the catalogue as it is, with a story, or building the page from `SafetyDocumentSheet` and the `MarkdownView` it uses. - Build on `SafetyDocumentSheet`, doing only what the existing design needs. `app/safetyfiles/documents.py` (R10) sends each document as an allowlisted tree of typed nodes that the browser turns into React elements, never HTML, and `SAFETY.md` says the sheet shows the full source commit. So the sheet takes its body as children instead of Markdown, and the node renderer moves into the catalogue to fill it. No API change. Answered in `/g`, 24 November 2026.
- [x] **Do text fields and selects take round corners too?** `theme.ts` sets `radius: 0` on `TextInput`, `Select`, `MultiSelect`, `Textarea` and `PasswordInput` as well as `Button`. Phase 1 makes buttons round; square fields beside round buttons may look mismatched. `Card` stays as it is either way, since `BaseCard` already sets `radius="md"`. - Yes: fields and selects go round with the buttons. Answered in `/g`, 24 November 2026.
- [x] **Does Phase 5 move both organisation pages in one pull request?** `OrganisationPage` alone is 431 lines, with members, appointments and invitations. - No: the list and the single organisation page are separate phases. Answered in `/g`, 24 November 2026.
- [x] **Is one pull request that restyles every page acceptable for Phase 1?** It changes the fonts, type sizes, focus ring and dark-mode colours of every page at once, before any page moves. The alternative, switching the theme last, leaves each moved view looking wrong in the app until the end. - Yes: the theme switches first, reviewed from the screenshots. Answered in `/g`, 24 November 2026.
- [x] **Where do the pull requests' screenshots live?** GitHub has no public API for putting an image into a pull request description; the website's upload needs a signed-in browser, which `/f` does not have. - On an orphan branch, `pr-screenshots`, sharing no history with `main`, linked from each description by URL. Nothing lands on `main`, and a branch with no workflow files runs no workflows. Deleting the branch later breaks the old links. Answered in `/g`, 24 November 2026. Replaced the same day: see the next question.
- [x] **Can `gh` upload the screenshots itself?** The answer above rested on GitHub having no upload API, which was out of date: `gh` 2.99.0, from 1 September 2026, added `--attach` to `gh pr create`, `gh pr edit` and `gh pr comment`. It uploads each image to GitHub's own attachment storage, as dragging it in on the website does, and rewrites a local path in the description to the uploaded link. - Yes: use `gh pr edit --attach`, and drop the orphan branch. Tested on 24 November 2026 with a throwaway draft pull request, #157, which uploaded two images with this account's fine-grained token and was then closed, with its branch deleted. Answered in `/g`, 24 November 2026.

## Phase 1: Switch the app to the components theme

- [x] In `frontend/src/main.tsx`, pass `theme` and `cssVariablesResolver` from `theme.ts` to `MantineProvider` instead of `legacyTheme`, and import what `.storybook/preview.tsx` imports: both font packages, `@mantine/dates/styles.css`, `@mantine/tiptap/styles.css` and the four stylesheets in `src/styles/`. Take out the comment that says the pages keep their own look. After this the app and Storybook render with the same theme and styles.
- [x] Give buttons and fields round corners. Both themes set `Button: { defaultProps: { radius: 0 } }`, so every button in the app and in Storybook is square today. Remove that line from `theme.ts`, so buttons take Mantine's default radius, and add a case to `theme.test.tsx` that checks the theme sets no square radius on `Button`. Remove it from `TextInput`, `Select`, `MultiSelect`, `Textarea` and `PasswordInput` too, so fields share the buttons' corner, and check all six in the test. Any button that passes `radius={0}` itself takes it out. As built, Mantine's default radius is `md`, not `sm` as first written here, so the test checks the theme keeps Mantine's own default rather than a fixed size. `Card` keeps its square default, since `BaseCard` sets its own.
- [x] Fix what the switch breaks in the existing pages, and nothing more: rules in `frontend/src/app.css` that fight the shared stylesheets, and colours that fall below contrast on the new dark-mode palette. Do not move any page onto the shared components here.
- [x] Delete `frontend/src/legacyTheme.ts` and `legacyTheme.test.tsx`, since nothing uses them. Move the check that the app uses the right theme into a new `theme.test.tsx` case, or beside it, reading `main.tsx` as the old test did: it passes `theme` and its resolver, and imports the shared stylesheets. Point `pages/workflows.test.tsx` at `theme` as well.
- [x] Check: `./s/frontend` passes, with the Storybook build, and `./s/lint` passes. Start the stack with `./s/up -d`, build the demo safety file and its account with `./s/seed-demo`, and take screenshots with Playwright, from `frontend/node_modules`, of the sign-in page, the safety files list, a safety file, a hazard and the hazard form, in light and dark mode, after the switch. Put them in the pull request description under a `## Screenshots` heading with `gh pr edit --attach`, as the screenshots decision below sets out, so the change of look is reviewed on purpose. `SAFETY.md` needs no change: the pages show the same content, and nothing derives or sends a risk level.

As built:

- **Mantine's default radius is `md`**, so buttons and fields are rounded at `md`. The test checks the theme keeps Mantine's own default rather than a fixed size.
- **The legacy theme's contrast and link checks moved into `theme.test.tsx`**, pointed at the shared theme: dimmed and error text at 4.5:1 or better on the body and surface in both schemes, links on `--link-color`, and no inline link colour. The entry point test now checks that `main.tsx` loads exactly the fonts and stylesheets Storybook's preview loads, so the two cannot drift.
- **Nothing in `app.css` needed changing for the switch.** The screenshots showed no clash in light or dark mode. The document page's grey code and source boxes do not adapt to dark mode, which was already true before; the app has no colour scheme switch yet, and Phase 14 rebuilds that page.
- **Roadmap R57 now says the pages render with the shared theme**, still unticked, since the pages have not yet moved onto the shared components.
- **The frontend container needed rebuilding** with `./s/up -d --build --renew-anon-volumes frontend`. Its `node_modules` volume predated the Storybook port and had no font packages, so Vite could not load `main.tsx`. Another worktree's stack held the default ports, so this one ran with the `TURVA_*_PORT` variables `./s/up` documents.
- **As run on 24 November 2026**: `./s/frontend` passed (1,378 tests, the build and the Storybook build), `./s/lint` passed, and `./s/test` passed (611 Django tests, and the host suites).

## Phase 2: The app shell

- [x] Create `AppHeader` in `components/layouts/`, with a story and a test, and use it in `App.tsx` in place of the inline `Header`. Keep the brand band, the yellow rule, the main navigation landmark and its links, and the sign-out button with its busy state.
- [x] Use `PageSpinner` for `RequireSession`'s "Checking your session" loader, keeping its accessible name.
- [x] Check: `./s/frontend` and `./s/lint` pass. The skip link still reaches the main content. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

As built:

- **`AppHeader` takes `signedIn`, `onSignOut` and `signingOut` as props**, as the components rule asks, and `App.tsx` passes the session's state in. Its colours sit in `AppHeader.module.css` on `--brand-primary` and `--brand-secondary`, replacing the inline styles. The header rules in `app.css` went with it.
- **All seven "Checking your session" waits use `PageSpinner`**, not only `RequireSession`'s, since the invitation route and the others showed the same bare loader.
- **A new `App.test.tsx` covers the shell**: the spinner while the session is checked, the skip link reaching `#main-content`, and the navigation once signed in.
- **The Storybook accessibility check did not run locally.** It needs Playwright's Chromium build 1248, and the host has only 1254, so CI runs it.
- **As run on 24 November 2026**: `./s/frontend` passed (1,386 tests, the build and the Storybook build), `./s/lint` passed, and `./s/test` passed (611 Django tests, and the host suites).

## Phase 3: Sign-in, registration, verification and password reset

- [ ] Move `LoginPage`, `RegistrationPage`, `VerificationPage` and `PasswordResetPage` onto `Form`, `TextField`, `EmailField`, `PasswordField` and `PublicButton`, with `react-hook-form` in place of `@mantine/form`, and `PageHeader` for each title. Keep every field's label, the validation messages, the redirect after sign-in to the page the user came from, and the session calls in `auth/` as they are. Failures show through `FormStatus`, as extended in the next step.
- [ ] Extend `FormStatus` in `components/form/Form/` so its error variants move focus to the alert when it appears, as `SaveFailure` does, and take a prop that adds "Your entries have not been cleared." to the description. ADR 0004 needs a stale save to say the draft was kept. Add a story for each and tests for the focus and the line. Every later phase uses it in place of `SaveFailure`.
- [ ] Check: `./s/frontend` and `./s/lint` pass, with `account-workflows.test.tsx` rewritten where the new components need it, still testing what this check names. No change to who can sign in or register: the pages call the same endpoints with the same bodies. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 4: Invitation and profile

- [ ] Move `InvitationPage` and `ProfilePage` onto the form fields, `PageHeader` and the buttons, as Phase 3 did. The profile keeps the professional registration fields and the Clinical Safety Officer declaration exactly as they are sent today; `declare_cso()` stays the only way to become a CSO.
- [ ] Check: `./s/frontend` and `./s/lint` pass. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 5: The organisations list

- [ ] Move `OrganisationsPage` onto `DataTable` and `PageHeader`. Keep its request as it is.
- [ ] Check: `./s/frontend` and `./s/lint` pass. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 6: The organisation page

- [ ] Move `OrganisationPage` onto `DataTable`, the form fields and `ConfirmModal` for anything that removes a member or an appointment. Keep every request and its body as it is: organisation administration is not evidence authority (ADR 0006), and this phase changes only how the page looks.
- [ ] Check: `./s/frontend` and `./s/lint` pass, with `organisation-workflows.test.tsx` rewritten where the new components need it, still testing what this check names. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 7: The file team

- [ ] Move `FileTeamPage` onto `DataTable`, the form fields and `ConfirmModal`. Keep its writes, and the `expected_head` they send, as they are. This page changes who can edit a safety file only through the same API calls it makes today; the phase changes none of them.
- [ ] Check: `./s/frontend` and `./s/lint` pass. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 8: The safety files list and the new safety file form

- [ ] Move `SafetyFilesPage` onto `SafetyCaseTable` and `PageHeader`, fetching through `listFiles` in `lib/safety/api.ts`. Move `SafetyFileCreatePage` onto the form fields, sending through `createFile`.
- [ ] Check: `./s/frontend` and `./s/lint` pass. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 9: The safety file page

- [ ] Move `SafetyFileDetailPage` onto `HazardTable` in place of `HazardLog`, and `DataTable` for the mitigations and the history in place of `MitigationList` and `HistoryTable`, fetching through `getFile`. `PDFDownload` stays as it is. The page shows the risk levels the server sent, and works none out.
- [ ] Delete `HazardLog`, its test and `MitigationList`, which nothing else uses. `HistoryTable` stays until Phase 13.
- [ ] Check: `./s/frontend` and `./s/lint` pass. The pull request says `SAFETY.md` needs no change, since the levels shown are the server's (TH-008). Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 10: The hazard page

- [ ] Move `HazardDetailPage` onto `HazardDetail`, passing `hazardOptions` so each score shows its words, and onto `DataTable` for the hazard's history. Fetch through `getHazard`.
- [ ] Check: `./s/frontend` and `./s/lint` pass, with `HazardDetailPage.test.tsx` rewritten where the new components need it, still testing what this check names. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 11: The hazard form

This is the riskiest move: the form is where severity and likelihood are captured, and TH-008 in `SAFETY.md` is the hazard of a wrong risk level.

- [ ] Move `HazardFormPage` onto `HazardForm`, with its default `previewAssessment` from `lib/safety/api.ts`. Writes go through `addHazard` and `updateHazard` with the `head_sha` the page read as `expected_head`, inside the same single save the page makes today. A 409 (`isConflict`) keeps the draft and says somebody saved first, as ADR 0004 requires; never refetch and resend. Keep the close and transfer behaviour the page has now, with its reason field.
- [ ] Delete `RiskLevel`, which nothing uses after this phase.
- [ ] Check: `./s/frontend` and `./s/lint` pass, and `./s/test` passes with the stack up. `hazard-writes.test.tsx` still shows that no request body holds `risk_level`, that a write carries `expected_head`, and that a 409 keeps the draft. The pull request's `## Risks` section says whether `SAFETY.md` changed for TH-008, and why. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 12: Mitigation components

The catalogue has no mitigation components, and pages may use only components from the catalogue, so they are built before the pages move.

- [ ] Create `MitigationDetail` and `MitigationForm` in `components/safety/`, with stories and tests, on the types in `lib/safety/types.ts` and the shape of `HazardDetail` and `HazardForm`. `MitigationForm` takes `mitigationOptions`, names the hazards the mitigation addresses, as Turva's write expects, and hands back values with no `expected_head`: the version read goes to the write function, as for hazards.
- [ ] Check: `./s/frontend` passes, with the Storybook build, `./s/lint` passes, and `npm run test-storybook:ci` passes every story in light and dark mode. Put screenshots of each new story, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 13: The mitigation pages

- [ ] Move `MitigationDetailPage` onto `MitigationDetail` and `DataTable` for its history, and `MitigationFormPage` onto `MitigationForm`, writing through `addMitigation` and `updateMitigation` with `expected_head`, and keeping the draft on a 409.
- [ ] Delete `HistoryTable`, which nothing uses after this phase.
- [ ] Check: `./s/frontend` and `./s/lint` pass, and `./s/test` passes, with `mitigation-writes.test.tsx` rewritten where the new components need it, still testing what this check names. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 14: The safety document page

- [ ] Move the node renderer out of `components/SafetyDocument.tsx` into the catalogue, as `components/safety/DocumentNodes.tsx`, with a story and a test. Keep its allowlist check of every node, its link rules, and its refusal ever to insert HTML: `app/safetyfiles/documents.py` sends a tree of typed nodes so that nothing in a document can run, load a resource or style the page. Keep the visible placeholders for images and active content, and the escaped source shown when the server refused a formatted view.
- [ ] Change `SafetyDocumentSheet` to take its body as `children` instead of `text`, so the page fills it with `DocumentNodes`, and make `status` optional, since `SafetyFile` has no status yet. Keep the header naming the system and the full commit the reader is seeing, from the response's `head_sha`, as `SAFETY.md` says the sheet shows it. Update its stories and tests to pass children. Take the "Not yet in Turva's API" line off the sheet's stories, since a route now backs it, but keep it on any story that still shows a status.
- [ ] Move `SafetyDocumentPage` onto `SafetyDocumentSheet` and `DocumentNodes`, keeping `documentPath` and its refusal of a bad path, the "does not exist or you do not have access" message, and the list of the file's other documents. Delete `components/SafetyDocument.tsx`.
- [ ] Check: `./s/frontend` and `./s/lint` pass, with `SafetyDocumentPage.test.tsx` rewritten where the new components need it, still testing that a bad path is refused, that raw HTML shows only as text, and that the commit is shown. The pull request says whether `SAFETY.md` needs a change for TH-001 and TH-005, since the document view now renders through the catalogue. Put screenshots of each view this phase moves, in light and dark mode, in the pull request description under a `## Screenshots` heading, uploaded with `gh pr edit --attach`.

## Phase 15: Clean-up

- [ ] Delete `SaveFailure`, and the rules in `app.css` that only the old pages needed.
- [ ] Remove `@mantine/form` from `frontend/package.json` once no file imports it, and run `npm install` through `./s/frontend` to update the lock.
- [ ] Check: `./s/frontend`, `./s/lint` and `./s/test` pass. A search of `frontend/src/pages/` finds no import from `@mantine/form` and no component from outside `components/`.

## Decisions

- **No phase changes a hazard in `SAFETY.md`** - a phase may add an assurance note, as the Storybook port did for each component group, and every pull request's `## Risks` section says whether `SAFETY.md` changed and why. If a phase finds that a hazard itself needs adding or changing, it stops and says so in its pull request, because a Clinical Safety Officer decides any new or changed hazard, not the run.
- **Screenshots uploaded with `gh --attach`** - each phase saves its PNGs outside the repository, writes the `## Screenshots` section with ordinary local image paths, such as `![The hazard form in dark mode](./hazard-form-dark.png)`, and runs `gh pr edit <number> --body-file <file> --attach <each image>`. `gh` uploads each image to GitHub's attachment storage and swaps its path for the uploaded link, so nothing lands in a branch or in Git history. Each image has alt text and a sentence beside it saying what it shows, for anyone who cannot see it. It needs a person's token, not an Actions or app token, and the skills that build and land each phase already run as a person. An orphan branch was chosen first and replaced the same day, once the flag was found and tested.
- **The theme switches first** - Mantine writes its theme variables once at the root, and the shared stylesheets are global, so a moved view inside the old theme would still look old. Switching first means every later phase is a pure swap of components, reviewed on its own, and `legacyTheme.ts` goes in Phase 1 rather than lingering to the end. The cost is one pull request that restyles every page before any of them moves.
- **One group of views per pull request** - pages that share components and tests move together, so each pull request is one sitting's reading. The hazard form has a phase of its own because of TH-008.
- **Old components go when their last user goes** - each is deleted in the phase that removes its last import, so the code never carries two versions of the same thing for longer than it must.
- **Components ahead of the API stay out of the pages** - the components marked "Not yet in Turva's API" show features with no route behind them. Putting them in a page would show users controls that do nothing, so they wait for their routes.
