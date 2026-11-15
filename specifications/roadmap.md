# Turva Development Roadmap

This roadmap lists remaining work, not completed features. Completed entries are removed; their implementation and assurance history remain in Git, [SAFETY.md](../SAFETY.md), the [ADRs](adr/) and the [demo walkthrough](../demo/README.md).

**It is much wider than the funded build.** [Phase One Scope](phase-one-scope.md) sets the delivery boundary; inclusion here does not expand it. The [Quill port decisions](quill-port.md) define the remaining agreed workflows. Formal two-stage sign-off, public publishing, OCR and AI remain outside that port.

Legend: [ ] not started, [~] partially implemented with work remaining. Every task has a stable `R<number>` code. Keep codes when moving or editing tasks; never renumber or reuse them. R1-R9 are completed and retired. Consolidated duplicate entries have one code, not several competing copies.

**Overnight coding is assigned through human-approved GitHub issues, not this roadmap.** Follow [the overnight policy](nightly-triage.md); roadmap items can only become proposals when its empty-queue conditions are met.

## Active delivery queue

- [ ] **R10 - Safety document reading and authoring.** Preserving rich-text/Markdown editing, sanitised viewing, explicit whole-document saves and retained conflict drafts. GitHub [#54](https://github.com/turva-uk/turva/issues/54), [#55](https://github.com/turva-uk/turva/issues/55).
- [ ] **R11 - Supplier onboarding and local assessment.** Immutable DOCX/text-PDF sources, versioned provenance, persistent extraction candidates including unreadable content, reasoned exclusions and CSO-confirmed local assessments. Supplier scores remain separate; never guess scores or silently omit rows. GitHub [#56](https://github.com/turva-uk/turva/issues/56), [#57](https://github.com/turva-uk/turva/issues/57), [#58](https://github.com/turva-uk/turva/issues/58).
- [ ] **R12 - Guided deployment workflow.** Versioned, upstream-cited guidance and mechanical progress, distinguishable from clinical judgement and never approval/compliance. Workshops remain reminder-only. GitHub [#59](https://github.com/turva-uk/turva/issues/59).
- [ ] **R13 - Scoped mitigation delegation.** Verified-email invitations for internal/external delegates, implementation evidence returned to a CSO for verification or return, attributable Git provenance and immediate revocation. Start with text/references, not new attachments. GitHub [#60](https://github.com/turva-uk/turva/issues/60), [#61](https://github.com/turva-uk/turva/issues/61).
- [ ] **R14 - Scheduled reminders and end-to-end acceptance.** Weekly digests/snoozing after 30/14/14-day thresholds, console-mail exercises and complete supplier-to-DCB0160 journeys, including permissions and failure states. Real supplier-specimen validation and production gates remain explicit. GitHub [#62](https://github.com/turva-uk/turva/issues/62), [#63](https://github.com/turva-uk/turva/issues/63).

## Risk presentation and matrix assurance

- [ ] **R15 - Exact NHS England risk colours.** Take the exact RGB values and corresponding hex codes from the agreed official NHSE clinical risk matrix source, recording its URL, version, page/table, checksum, reuse terms and colour-space interpretation. Do not eyeball screenshots or substitute brand/Mantine colours. Share the palette across initial/residual risk displays and any coloured exports; retain numeric/text labels and test contrast and all 25 cell mappings. Depends on R17.
- [ ] **R16 - Optional visual hazard risk matrix.** Evaluate an accessible 5-by-5 likelihood-versus-severity view showing exactly where the hazard's initial and residual assessments lie, including when they occupy the same cell. Use the R15 colours, canonical server-provided cells, clear axes/legend and equivalent text; verify keyboard, narrow-screen, zoom and print use. Position markers from recorded severity/likelihood, never a second scoring formula or a new risk-entry control. Depends on R17.
- [ ] **R17 - Clinical review of the adopted risk matrix.** Have a CSO confirm the chosen matrix, scales, acceptability criteria and source against all 25 cells. Resolve differences from the published example explicitly, with independent source-derived test vectors and a recorded decision about any correction and its effect on existing evidence/exports. Do not silently regrade historical assessments or treat current tests as clinical validation.

Source checked on 15 November 2026: [DCB0160 implementation guidance v4.2, 2 May 2018](https://digital.nhs.uk/binaries/content/assets/website-assets/data-and-information/information-standards/standards-and-collections/dcb0160/0160252018impguid.pdf#page=35), Table 9, page 35. Section 4.4, page 33, says its classifications are illustrative and the organisation must document its chosen criteria. Turva's current lookup differs from that example at L2/S3, L3/S2, L3/S4, L3/S5 and L4/S3; see [TH-008](../SAFETY.md#planned-risk-presentation-and-source-review). The existing 1-5 lookup is not simple arithmetic multiplication of likelihood and severity. This roadmap update changes neither scoring nor rendering.

## Wider backlog

The remaining sections preserve longer-term and assurance work. They are not an ordered implementation queue or a promise that every item is funded.

### Application and access

- [ ] **R18 - Rate limiting.** Cover login, password reset and other abuse-prone endpoints without weakening generic account-recovery responses.
- [ ] **R19 - Error tracking.** Evaluate and configure an error-reporting service such as Sentry with appropriate data minimisation.
- [ ] **R20 - Retire the interim Django interface.** Remove templates/routes only after React covers their workflows, including production routing and failure states.
- [ ] **R21 - Accessibility audit.** Check WCAG 2.2 AA with keyboard-only and screen-reader use, including risk information and form failures.
- [~] **R22 - Remaining responsive and zoom coverage.** Finish interim and new screens beyond the delivered responsive tables; inspect phone/tablet/desktop and zoom states.
- [ ] **R23 - Edit safety-file information.** Update project metadata and narrative through attributable, opened-version saves, keeping the database index rebuildable.
- [ ] **R24 - Safety-file archival.** Archive without deleting safety evidence or losing its history; consolidate the former project-archival duplicates here.
- [ ] **R25 - Explicit ownership and organisation transfer.** Define reviewed transfer workflows distinct from changing a named team; never infer access from names, ancestry or prior ownership.
- [ ] **R26 - Organisation profile and settings.** Add editing beyond the delivered operator provisioning, memberships, invitations and CSO appointments.
- [ ] **R27 - Hazard categorisation.** Define useful categories and their validation/search behaviour without altering the canonical risk assessment.
- [ ] **R28 - Mitigation effectiveness over time.** Track review of control effectiveness beyond the existing status and implementation-evidence fields.

### Safety-file storage and document generation

- [ ] **R29 - Evidence-derived safety-case summaries.** Generate summary figures and residual-risk statements from canonical hazard data rather than unverified prose; do not present incomplete evidence as a complete safety argument.
- [ ] **R30 - Artefact version comparison.** Show a readable diff between two recorded versions while preserving rename-following history.
- [ ] **R31 - Safety-repository backups.** Automate backups of the Git system of record and exercise restoration, with appropriate retention and access controls.
- [ ] **R32 - Operational database backups.** Back up and restore users, sessions, membership, appointment and invitation state as well as the rebuildable index; restored Git teams must not recreate live grants.
- [ ] **R33 - Storage and processing quotas.** Bound repository/upload/cache growth and aggregate import/export resource use beyond the existing per-render limits.
- [ ] **R34 - Safety-file branches for major changes.** Define the clinical review and provenance model before exposing repository branch management.
- [ ] **R35 - Reviewed conflict resolution.** Add explicit comparison/resolution workflows beyond the current stale-save refusal and retained drafts; never automatically merge clinical judgements.
- [ ] **R36 - Safety-file release tags.** Identify reviewed evidence snapshots without rewriting history or implying that a tag itself is clinical approval.

### Templates and placeholders

- [ ] **R37 - DCB0129 manufacture template.** Provide the correct manufacturer document set rather than scaffolding it from the deployment template.
- [~] **R38 - Expanded creation-time placeholders.** Extend validated placeholder/common-field population beyond current defaults; templates scaffold once and must not silently re-render historical evidence.
- [ ] **R39 - Context-aware template suggestions.** Keep suggestions distinct from clinical judgement; any AI path remains subject to the separate AI gates below.
- [ ] **R40 - Reusable template library.** Cover additional safety cases, hazards, risk assessments and mitigations beyond the existing DCB0160 scaffold.
- [ ] **R41 - Template import/export.** Preserve provenance, check reuse terms and validate imported structure.
- [ ] **R42 - Custom template authoring.** Support reviewed custom templates without allowing repository configuration or hooks into the controlled export pipeline.

### Reports and exports

- [ ] **R43 - Hazard-log CSV/Excel export.** Export canonical hazards, assessments and links without creating independently editable risk levels.
- [ ] **R44 - Additional controlled document formats.** Start with DOCX, retaining the PDF pipeline's explicit scope, source-version identity and visible unsupported-content failures.
- [ ] **R45 - Community Zensical PDF exporter.** Evaluate extracting the controlled exporter as a reusable plugin; this is separate from Turva's delivered draft PDF download.
- [ ] **R46 - Audit-trail report/export.** Derive reports from attributable Git history rather than introducing a second authoritative evidence audit table.
- [ ] **R47 - Risk-profile reports.** Summarise initial and residual assessments beyond the current hazard log, using canonical derived levels.
- [ ] **R48 - Compliance evidence reports.** Link DCB0129/DCB0160 and other relevant criteria to recorded evidence; reports are not certification or automated clinical approval.

### User experience

- [ ] **R49 - Dashboard widgets.** Prioritise frequent clinical-safety work rather than generic dashboard cards.
- [ ] **R50 - Activity feed.** Present attributable changes with appropriate file visibility checks.
- [ ] **R51 - In-app activity notifications.** Separate them from the agreed email-reminder workflow and avoid disclosure across file boundaries.
- [ ] **R52 - Quick actions.** Define useful shortcuts without bypassing deliberate saves or opened-version checks.
- [ ] **R53 - Search across authorised evidence.** Add dashboard/full-text search beyond filtering one loaded hazard log; enforce current access on results.
- [ ] **R54 - User onboarding.** Guide new users through setup without implying that completing onboarding establishes CSO competence.
- [ ] **R55 - Contextual interface help.** Provide control-level help, tooltips and guides, distinct from the clinical process guidance in R12.
- [ ] **R56 - User-configurable comfort themes.** Check every colour pairing and preserve the agreed risk palette, labels and readability across themes.
- [ ] **R57 - Dark mode.** Treat it as the first tested comfort theme, not an unverified palette swap.
- [ ] **R58 - Contrast and motion preferences.** Respect `prefers-contrast` and `prefers-reduced-motion`.
- [ ] **R59 - Primary-action colour decision.** Review whether brand yellow with dark text should identify the primary action; record the hierarchy decision and contrast evidence.

### Browser-local dictation

Dictation must keep audio and transcripts on the device, following [the local-inference privacy principle](llm-strategy.md#privacy-and-confidentiality). It does not introduce workshop hosting or recording.

- [ ] **R60 - Evaluate browser-local speech recognition.** Review `parakeet.js` or an equivalent maintained, suitably licensed ONNX Runtime Web/WebGPU implementation.
- [ ] **R61 - Dictation controls for long text.** Cover hazard descriptions, mitigation rationale and safety-case narrative, with explicit listening state and a visible stop control; never listen silently.
- [ ] **R62 - Typing fallback.** Keep typing as the baseline when WebGPU, the model or microphone access is unavailable.
- [ ] **R63 - Target-device dictation validation.** Check NHS-device/browser support and the acceptability of the one-time model download before shipping.

### Engineering quality and testing

- [ ] **R64 - Python type checking.** Introduce an exercised mypy gate with an explicit scope.
- [ ] **R65 - Docstring linting.** Adopt useful, enforceable documentation checks rather than an untested configuration.
- [ ] **R66 - Complexity analysis.** Measure and address risky complexity without imposing arbitrary rewrites.
- [ ] **R67 - Conventional-commit enforcement.** Add commit-message checking to the established commit convention.
- [ ] **R68 - Branch-name validation.** Validate the relevant branch conventions, including issue-number/title slugs for overnight work.
- [ ] **R69 - Pending-migration startup guard.** Fail visibly when the application schema is behind; do not silently run destructive production migrations.
- [ ] **R70 - CI coverage floors.** Enforce statement/branch coverage for risk, permission and audit paths, with the required complete coverage on safety-critical logic.
- [~] **R71 - Remaining unit and API integration coverage.** Identify and cover actual gaps beyond the delivered suites, rather than retaining blanket tasks for models/endpoints already tested.
- [ ] **R72 - Performance and capacity tests.** Measure representative files, imports, exports and concurrent use before making production-capacity claims.
- [ ] **R73 - Security regression coverage.** Audit and test remaining boundary gaps in input validation, ORM usage, escaping, CSRF and access controls; the existing baseline protections are not unimplemented features.
- [ ] **R74 - Browser compatibility tests.** Exercise supported browser/device combinations and visible fallbacks.
- [ ] **R75 - Automated accessibility regression checks.** Complement, not replace, the human keyboard/screen-reader audit in R21.

### Documentation

- [ ] **R76 - OpenAPI documentation.** Publish and exercise the SPA API schema and its authentication/CSRF/error contracts.
- [ ] **R77 - User guide.** Cover delivered clinical-safety workflows and their limits.
- [ ] **R78 - Administrator guide.** Distinguish organisation administration, evidence authority and operational recovery.
- [~] **R79 - Complete the developer guide.** Build on the existing README, development notes, scripts and demo exercises rather than duplicating setup instructions.
- [ ] **R80 - Deployment guide.** Document production configuration, migrations, backups, restoration and safe updates.
- [ ] **R81 - Security architecture and operations documentation.** Extend beyond the existing vulnerability-disclosure policy.
- [ ] **R82 - Standards-to-evidence mapping.** Map applicable DCB0129/DCB0160 controls to implementation, tests and clinical review evidence.

### Production deployment and operations

- [ ] **R83 - Production deployment configuration.** Complete React/static routing, Gunicorn/Caddy operation, persistent storage and deployment settings for the scoped single-VPS design.
- [ ] **R84 - Disaster recovery plan.** Rehearse repository and operational-database restoration together, including failure-closed access recovery.
- [ ] **R85 - Performance monitoring.** Monitor application and import/export latency without disclosing private evidence.
- [ ] **R86 - Uptime monitoring.** Monitor availability using the existing database-aware health endpoint.
- [ ] **R87 - Database monitoring.** Detect capacity, connection and backup problems.
- [ ] **R88 - Security monitoring.** Define actionable alerts, data minimisation and response ownership.
- [ ] **R89 - Security audit.** Independently review the deployed design and safety-relevant boundaries.
- [ ] **R90 - Authorised penetration testing.** Define targets and permission explicitly; use isolated, fictional data unless separately authorised.
- [ ] **R91 - Content Security Policy.** Define, exercise and deploy a policy compatible with the actual React/Django delivery paths.
- [ ] **R92 - Production security-header verification.** Check the complete Django, React/static and Caddy response paths beyond the existing Django production defaults.

### Clinical governance and assurance

- [ ] **R93 - DCB0129 alignment review.** Review Turva's own manufacturer-side evidence and residual gaps with the responsible clinical safety owner.
- [ ] **R94 - DCB0160 workflow review.** Independently review the deployment workflow and generated evidence; successful software tests are not clinical acceptance.
- [ ] **R95 - GDPR review.** Cover account and organisation information, retention and access even though Turva does not process patient data.
- [ ] **R96 - ISO 13485 considerations.** Establish applicability and any quality-management implications before claiming alignment.
- [ ] **R97 - ISO 14971 considerations.** Review applicable risk-management requirements and their relationship to the clinical-safety process.
- [ ] **R98 - Complete regulatory and safety-governance records.** Resolve the named clinical-safety-owner and dated medical-device-applicability decisions identified in SAFETY.md.
- [ ] **R99 - Internal audit process.** Define repeatable checks and attributable evidence of findings and follow-up.
- [ ] **R100 - External audit preparation.** Assemble reviewable evidence and unresolved questions without presenting draft assessments as accepted.
- [ ] **R101 - Certification documentation.** Establish any applicable certification route and its evidence requirements; do not assume every standard listed here requires certification.
- [ ] **R102 - Wider clinical risk management system records.** Define process, governance and training-requirement tracking beyond the existing creation-time plan scaffold.

## Deferred capabilities

These retain the wider product direction, not permission to expand the current build. Each needs a separately reviewed scope and, where relevant, a new hazard analysis or architecture decision.

### Publishing, roles and formal review

- [ ] **R103 - Explicit public/private publishing controls.** Keep private drafts as the default and make publication a deliberate governance decision.
- [ ] **R104 - Community/public safety-file browsing.** Add the missing interface only after publication and access policies are agreed.
- [ ] **R105 - Additional reviewer/read-only roles.** Extend beyond current named CSOs and planned mitigation delegates with explicit grants, not organisation/parent inheritance.
- [ ] **R106 - Formal review and sign-off workflow.** Cover review requests/comments, named approvers and version-bound sign-off; formal two-stage approval remains deferred.
- [ ] **R107 - Conditional and multi-level approvals.** Define conditions, escalation and approval chains separately from the initial sign-off workflow.

### Incidents and collaboration

- [ ] **R108 - Clinical safety incident records.** Support incident reporting and links to the relevant hazards and evidence.
- [ ] **R109 - Incident investigation and closure.** Record investigation, decisions and justified closure without erasing the original incident.
- [ ] **R110 - Hazard discussions and mentions.** Add comments and mentions with attributable history and current visibility checks.
- [ ] **R111 - Team discussion threads.** Establish a concrete safety-workflow need before adding general chat functionality.
- [ ] **R112 - Real-time collaborative editing.** Define concurrency and explicit clinical conflict handling beyond the delivered serialised team saves.

### AI access

AI remains outside the current port, but its access design must support inference supplied by the user or the owning organisation, not just a personal API key. Personal, organisation and explicitly delegated unit/team settings must accommodate provider-supported credentials, OAuth and API-enabled subscriptions, including local/on-premises inference. No provider is architecturally excluded; actual integrations need a supported interface, policy checks and validation. See [the AI connection and settings strategy](llm-strategy.md) and [ADR 0007](adr/0007-user-and-organisation-supplied-inference.md). This changes the former profile-only assumption, not the clinical review gates or the funded delivery commitment.

AI use is optional and initiated by the user. Ordinary editing and saving must work without AI, credentials or an available model; configuring a connection does not enable automatic inference on page load, typing or save.

- [ ] **R113 - Personal API-key connections.** Provide profile-level BYOK as one supported connection scope, not a prerequisite when an authorised organisation connection is available. Use the shared scoped settings, credential lifecycle and provider contracts below.
- [ ] **R114 - Visible AI data flow.** Show the effective connection, credential/billing owner, provider, endpoint/location, model and exactly what information is sent; expose no secrets and never silently change the destination.
- [ ] **R115 - AI-assistance provenance and review.** Keep outputs as proposals until explicit human review and opened-version save; record available provider/model identity and source version in Git with the acting user's attribution, never credentials or a model-authored clinical decision.
- [ ] **R116 - User-driven MCP interface.** Evaluate access from a trusted external client under the [house-style MCP constraints](https://github.com/pacharanero/house-style/blob/main/mcp.md).
- [ ] **R117 - Turva-hosted inference.** Consider a separately scoped paid service later; it is not phase one or a default/fallback for user- and organisation-supplied inference.
- [ ] **R155 - Scoped AI connection settings.** Support personal and owning-organisation connections, explicitly delegated organisation-unit/team availability and narrower safety-file/project bindings. Define who manages versus uses each connection, defaults/overrides and billing ownership; do not infer permission inheritance or evidence access from the credential's owner.
- [ ] **R156 - Provider authentication and subscription connections.** Accommodate API keys, supported OAuth flows, token refresh/revocation and provider-supported cloud/service credentials. Connect subscriptions only through officially supported third-party API access; a chat subscription or copied consumer-session token is not assumed to grant API rights.
- [ ] **R157 - Secure credential lifecycle.** Keep secrets encrypted in protected operational storage, with write-only/masked settings, expiry, rotation, disconnection and audited management/use permissions. Keep keys and tokens out of Git, browser storage, prompts, exports and logs; enforce current connection-use authority and revocation.
- [ ] **R158 - Extensible inference-provider adapters.** Support native provider APIs, compatible gateways, custom endpoints and custom model/deployment identifiers through a capability-based contract, not a closed vendor/model list or an assumption that every API is OpenAI-compatible. Discover capabilities where supported and show unsupported combinations explicitly.
- [ ] **R159 - Local and organisation-hosted models.** Support approved user-/organisation-operated inference endpoints and hardware. Define whether local means the Turva host, an organisation network or a user's device, with reviewed connectivity, authentication and request-forgery protections; do not expose local services publicly or fall back to cloud inference automatically.
- [ ] **R160 - Effective connection selection and organisation policy.** Make scope/default/override resolution explicit and subordinate personal choices to the owning organisation's provider, data-residency and spending rules. Show who pays, apply quotas/timeouts and stop on unavailable credentials, denied endpoints or exhausted allowance instead of silently switching owner, provider or model.
- [ ] **R161 - Task-specific model recommendations.** Maintain dated, evidence-backed recommendations by task and capability, considering quality, privacy, cost, context limits, licence, latency and local hardware. Recommendations are optional guidance, not a hard-coded model restriction, clinical approval or a guarantee of output quality.
- [ ] **R162 - AI connection conformance and safety acceptance.** Test provider/authentication/scope combinations, secret redaction, OAuth callbacks/refresh, revocation, cross-organisation isolation, local endpoint restrictions, quotas and visible partial failures with fictional fixtures. Independently review the threat/hazard model before enabling clinical-safety assistance; accepted content still uses the existing Git, risk and conflict controls.
- [ ] **R163 - Optional inline AI wording assistance.** Offer an explicit "AI" action beside eligible narrative fields, proposing wording with red deletions/green additions and accessible non-colour cues. Preserve the original and provide accept/reject/edit/undo before a separate explicit Save. Keep normal editing independent of AI; prevent late/stale responses overwriting newer drafts or bypassing opened-version checks. See [the wording-review contract](llm-strategy.md#optional-inline-wording-assistance).

### Analytics and integrations

- [ ] **R118 - Risk trend analysis.** Compare attributable assessments over time without storing a second risk calculation.
- [ ] **R119 - Hazard pattern recognition.** Treat patterns as reviewable suggestions, not accepted safety evidence.
- [ ] **R120 - Predictive risk analytics research.** Review intended-purpose and safety implications first; predictions must not replace the canonical derived risk level or clinical judgement.
- [ ] **R121 - Cross-project insights.** Define authorised aggregation and prevent disclosure across file boundaries.
- [ ] **R122 - Benchmarking.** Establish appropriate, reviewable comparisons rather than implying that a peer score establishes safety.
- [ ] **R123 - Customer delivery-pipeline integration.** Link external CI/CD activity to safety evidence; Turva's own CI is already implemented.
- [ ] **R124 - Hazard-to-code traceability.** Link recorded hazards and decisions to relevant code changes.
- [ ] **R125 - File-change review triggers.** Surface changes needing hazard review without inventing new clinical judgements automatically.
- [ ] **R126 - External issue-tracker integration.** Evaluate GitHub/Jira adapters without turning development issues into the authoritative hazard store.
- [ ] **R127 - External version-control integration.** Define forge/adaptor workflows beyond Turva's native local Git storage.
- [ ] **R128 - Slack/Teams notifications.** Keep messages minimal and respect current evidence access.
- [ ] **R129 - Webhooks.** Define event scope, authentication, retry behaviour and disclosure limits.
- [ ] **R130 - Stable third-party HTTP API.** Build for a named funded consumer, with versioning/deprecation obligations distinct from the existing SPA API.

### Discovery and data management

- [ ] **R131 - Public safety-case search.** Depends on the publishing and browsing policies, not merely a permissive database queryset.
- [ ] **R132 - Cross-file hazard reuse/import.** Preserve source correspondence and require local review; reused content grants no inherited access or accepted local assessment.
- [ ] **R133 - Hazard recommendations.** Keep recommendations separate from accepted hazards and subject to any applicable AI gates.
- [ ] **R134 - Similar-hazard detection.** Define comparison and visibility rules, including private-file isolation.
- [ ] **R135 - Data-retention policies.** Reconcile evidence preservation, operational personal data and applicable retention obligations.
- [ ] **R136 - Compliance/portability data exports.** Cover authorised data exports beyond the document and evidence reports above.
- [ ] **R137 - De-identification for shared safety evidence.** Review accountability and provenance before producing a shareable derivative; this is not patient-data processing or silent rewriting of the source audit trail.
- [ ] **R138 - Bulk operations.** Preserve explicit authority, opened versions, attributable commits and visible partial failures.

### Extensibility and regional support

- [ ] **R139 - Plugin system.** Define a reviewed extension boundary without executing arbitrary safety-repository plugins/hooks.
- [ ] **R140 - Custom safety artefact types.** Define schema, validation, audit and migration contracts.
- [ ] **R141 - Custom workflow definitions.** Version definitions and separate mechanical progress from clinical decisions.
- [ ] **R142 - Custom report templates.** Retain controlled source scope, safe rendering and traceability to evidence versions.
- [ ] **R143 - Multi-language support.** Plan translation and accessible interface behaviour.
- [ ] **R144 - Localised risk matrices.** Require explicit clinical governance, versioning and compatibility decisions; never introduce freely editable risk levels.
- [ ] **R145 - Regional compliance variations.** Cite reviewed regional requirements without making unsupported compliance claims.
- [ ] **R146 - Wider delegated-authority tracking.** Define authority beyond the current named-team model and the scoped delegation in R13.
- [ ] **R147 - Mechanical compliance checks.** Make evidence gaps visible without claiming automated certification or clinical approval.
- [ ] **R148 - Policy enforcement engine.** Establish a concrete requirement and preserve the existing shared service/storage safety boundaries.

### Scaling and additional import formats

- [ ] **R149 - Kubernetes deployment.** Revisit only with a separately justified operational need; it is not the phase-one deployment model.
- [ ] **R150 - High availability.** Define evidence durability, operational recovery and shared-storage constraints before promising availability.
- [ ] **R151 - Load balancing.** Depends on an agreed multi-instance storage and authorisation model.
- [ ] **R152 - Multi-host evidence concurrency.** Revisit the local-filesystem lock contract before introducing shared/network storage or distributed writers.
- [ ] **R153 - OCR for scanned supplier documents.** Start only when a real specimen justifies it; retain unreadable candidates, provenance and explicit review rather than silently dropping content.
- [ ] **R154 - Existing hazard-log import.** Scope CSV/spreadsheet ingestion separately from supplier DOCX/PDF onboarding, preserving originals, provenance and explicit review of local assessments.

## Maintenance notes

The 15 November 2026 reconciliation removed completed entries, including previously unchecked organisation/mitigation work, controlled PDFs, container/dependency pinning, baseline security protections, logging and health checks. Duplicate future entries are consolidated above. Obsolete authoritative SQL evidence-table tasks and implicit permission inheritance were retired because they contradict [the architecture](architecture-principles.md) and [ADR 0006](adr/0006-named-file-teams-and-live-appointments.md), not because those designs should be implemented later.

**Last reconciled:** 15 November 2026. **Next milestone:** R10 - document reading and authoring. **Next unused code:** R164. Append new codes without renumbering; remove completed entries without recycling their codes.
