# Quill workflow port

Agreed with Marcus on 11 November 2026 after reviewing `turva-port-quill` at `82e51a62`. This is selective feature reuse in Turva's Django/DRF and React/Mantine application, not a migration to Quill. Christmas 2026 is a provisional planning target, not a confirmed customer deadline.

## Decisions

- Complete the funded supplier-to-deployment workflow first. Reuse features and fictional fixtures only; no Quill accounts or existing safety files need migrating.
- Keep Django sessions/CSRF, the framework-free storage library, attributable append-only Git evidence, the committed generated hazard log, canonical server-side risk calculation, opened-version preconditions and controlled Zensical/WeasyPrint draft exports.
- Federation and member practices have separate organisations and files. Parent membership grants no implicit access. Organisation administrators invite members and appoint CSOs; administrator status alone does not authorise safety judgements. Appointment is not professional verification.
- Each file has one accountable CSO and explicitly named CSO collaborators. Legacy files remain owner-controlled until explicitly adopted; never infer membership or access from a free-text organisation name.
- Delegates may be internal or external. Invitations are scoped to a mitigation and a verified email identity, not a whole-file share. Delegates submit implementation evidence; a CSO verifies or returns it. Start with text and references, not new evidence attachments.
- Keep supplier assessments separately from local deployment assessments. Persist every extraction candidate, unreadable rows and source correspondence. A CSO must confirm valid local scores before promoting a candidate into an assessed hazard. Exclusions require a reason. Do not guess scores or silently omit unreadable content.
- Rich-text editing supports ordinary prose, tables and template comments, with a preserving Markdown-source fallback for unsupported constructs. Explicit Save/Cancel and retained conflict drafts apply to every editor. Word-only round-trip checks are not sufficient preservation evidence.
- Guided progress is mechanical only, clearly labelled as neither clinical judgement nor approval/compliance. Do not add a general CSO step-confirmation ceremony. Explicit import review and mitigation verification remain separate safety decisions. Guidance and process definitions must be versioned, with upstream NHS England citations and checked reuse terms.
- Workshops remain reminder-only: no dates/attendees/notes record, meeting hosting or media recording. The CSO can handle or snooze a nudge without claiming a workshop took place.
- Send invitations immediately. Workshop nudges start after 30 days; unreviewed candidates and stalled mitigations after 14 days. Chase outstanding work in a weekly digest with snoozing. Local development uses console mail, not real recipients.
- Defer formal two-stage sign-off, public publishing, OCR and AI. Any later AI must start with profile-level BYOK and its own hazard analysis. PDF input extraction is required new work, not an implemented Quill feature.
- Retain AGPL-3.0 and attribution for reused code. Do not rely on Quill's unfinished alternative-licensing note or assume source-document content has the same licence as code.

## Delivery and assurance

The active queue in [roadmap.md](roadmap.md#active-delivery-queue) owns status. Deliver coherent, validated local commits on `feat/quill-workflow-port`; ask before pushing or opening a PR. `./s/up` remains the primary development entry point. Extend [the demo walkthrough](../demo/README.md) with each usable workflow, using fictional data only.

Run storage, PostgreSQL application/API, frontend and repository lint gates; inspect real phone/tablet/desktop states. Tests must exercise stale drafts, attribution, reciprocal links, private/cached access, revoked membership/invitations, incomplete source extraction and failed writes, not only success paths. Update `SAFETY.md` as controls ship; do not close hazards merely because tests pass.

A real supplier DCB0129 remains an acceptance prerequisite. Public and fictional DOCX/text-PDF fixtures allow implementation to proceed but cannot demonstrate fitness for every supplier document. No real patient data, credentials or unpublished supplier case belongs in Git or a test fixture.
