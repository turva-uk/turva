# Turva Development Roadmap

This roadmap tracks the implementation status of Turva features. Items are organised by domain area and marked with checkboxes.

**It is much wider than the funded build.** [phase-one-scope.md](phase-one-scope.md) is the authoritative list of what ships in the funded phase; everything else here is direction. See also [core-specification.md](core-specification.md) for the domain model and [architecture-principles.md](architecture-principles.md) for the design constraints.

## Foundation & Infrastructure

### User Management & Authentication

- [x] User model with password hashing (Argon2)
- [x] User registration
- [x] User login and logout
- [x] Email verification, with an eight-hour token lifetime and a resend cooldown
- [x] Session management (Django sessions in PostgreSQL)
- [x] Password reset
- [x] Admin interface for support
- [x] User profile management
- [x] Professional registration tracking, recorded but never verified by Turva
- [x] Clinical Safety Officer designation, self-declared and dated

### Database & Data Layer

- [x] PostgreSQL database setup
- [x] Django migrations
- [x] User table
- [x] Session table (`django.contrib.sessions`)
- [ ] Organization table
- [ ] Project table
- [ ] Hazard table
- [ ] Risk assessment table
- [ ] Mitigation table
- [ ] Safety case table
- [ ] Audit trail table
- [ ] Change record table

### Application Infrastructure

- [x] Django framework setup ([ADR 0001](adr/0001-use-django-for-phase-one.md))
- [x] Docker containerisation, application container running as a non-root user
- [x] Caddy reverse proxy
- [x] Gunicorn WSGI server
- [x] Health check endpoint that touches the database
- [x] `check --deploy` audit in CI, run against production-like settings
- [ ] Rate limiting, particularly on login and password reset
- [ ] Error tracking

### Interface Infrastructure

The React/Mantine/Vite frontend was removed to avoid building every screen twice. Django templates, progressively enhanced with HTMX, replace it.

- [x] Removed React, Mantine, Vite, Storybook and the separate frontend build
- [x] Django template layer and base layout
- [x] HTMX vendored and served from the application rather than a CDN
- [x] Authentication pages (register, login, verify, password reset)
- [x] Hand-written stylesheet, no utility framework
- [ ] HTMX partial-response conventions, once a view needs them
- [ ] Dashboard showing the user's safety files
- [ ] Error and empty states
- [ ] Accessibility audit against WCAG 2.2 AA with a screen reader and keyboard only

## Core Domain Features

### Projects

- [x] Create new project - scaffolds a Git repository and indexes it
- [x] Project listing (My Projects)
- [x] Project details page, reading hazards and history from the repository
- [ ] Project listing (Community/Public Projects) - the queryset supports it; no page yet
- [ ] Edit project information
- [ ] Project visibility settings (public/private) - modelled, defaults to private, no UI to change it
- [ ] Browse the safety file's documents in the interface. Today the detail page
      summarises the repository but there is no way to read the clinical risk
      management plan without opening the files
- [ ] Project archival
- [ ] Project ownership transfer
- [ ] Project team member management
- [ ] Project permissions system

### Supplier Safety Case Onboarding

Phase one, capability 3. The deploying organisation's DCB0160 starts from the
manufacturer's DCB0129, so the first real task in a new safety file is getting
the supplier's hazards into it without retyping them.

The constraint that shapes all of this: an extraction that silently drops or
garbles a hazard produces a safety case that is incomplete and looks complete.
See TH-010 in [SAFETY.md](../SAFETY.md).

- [ ] Upload a supplier DCB0129 safety case to a safety file
- [ ] Extract text and structure from `.docx`
- [ ] Extract text and structure from `.pdf`
- [ ] Propose hazards from the extracted document, as candidates requiring
      explicit CSO acceptance - never written straight into the hazard log
- [ ] Keep the correspondence between each accepted hazard and its location in
      the source document, so a reviewer can check the transcription
- [ ] Retain the original uploaded document in the repository as evidence
- [ ] Report what could not be extracted, rather than returning silently
- [ ] OCR for scanned documents - **stretch goal**, deferred until a real
      scanned safety case demands it

### Guided Clinical Safety Process

Phase one, capability 4, and the centre of the product: guidance derived from
published clinical safety guidance that leads an operator through the process
rather than presenting them with empty forms.

Guidance that walks someone through clinical safety can be mistaken for
performing it. See TH-011 in [SAFETY.md](../SAFETY.md).

- [ ] Model the process as explicit steps with a recorded position, so a CSO
      can leave and return
- [ ] Guided hazard log construction
- [ ] Cite NHS England guidance upstream at each step, attributed as the Open
      Government Licence requires, rather than paraphrasing it as Turva's own
- [ ] Email the CSO when a hazard workshop is due. **Turva does not host or
      record workshops** - the customer already has Teams, meeting rooms, and
      OBS or Loom, and duplicating those would be building the wrong thing.
      The workshop's output arrives back as hazards in the log
- [ ] Delegated hazard mitigation: assign a mitigation to someone who is not
      the CSO, who completes it and returns it
- [ ] Show each party whose turn it is
- [ ] Guidance must be distinguishable from the CSO's own judgement in the
      generated document

### Organizations

- [ ] Organization model
- [ ] Create organization
- [ ] Organization profile
- [ ] Organization settings
- [ ] Link Clinical Safety Officers to organizations
- [ ] Multi-organization support for users

### Hazards

- [x] Hazard model with versioning (in the storage layer; no interface yet)
- [ ] Create hazard through the interface - the next piece of work, and the
      point at which the generated hazard log's write pattern has to be settled
- [ ] Edit hazard (with version control)
- [ ] Hazard log view
- [ ] Hazard detail view
- [ ] Hazard categorization
- [ ] Hazard status management (open/closed/transferred)
- [ ] Hazard assignment
- [ ] Link hazards to causes and effects
- [ ] Link hazards to potential harms
- [ ] Hazard search and filtering
- [ ] Hazard export

### Risk Assessment

- [ ] Risk assessment model
- [ ] Initial risk assessment creation
- [ ] Residual risk assessment creation
- [ ] Severity scoring (1-5 scale)
- [ ] Likelihood scoring (1-5 scale)
- [ ] Automatic risk level calculation
- [ ] Risk matrix implementation
- [ ] Risk justification capture
- [ ] Risk assessment history
- [ ] Risk assessment approval workflow

### Mitigations

- [ ] Mitigation model
- [ ] Create mitigation
- [ ] Link mitigations to hazards
- [ ] Mitigation effectiveness tracking
- [ ] Mitigation implementation evidence
- [ ] Mitigation ownership
- [ ] Mitigation status tracking

### Safety Case

- [ ] Safety case model
- [ ] Safety case report generation
- [ ] Link safety case to hazards
- [ ] Link safety case to risk assessments
- [ ] Link safety case to mitigations
- [ ] Clinical context documentation
- [ ] Intended use documentation
- [ ] Safety case export (PDF/Markdown)

### Clinical Risk Management System

- [ ] Clinical risk management plan template
- [ ] Process documentation
- [ ] Role definitions
- [ ] Governance arrangements
- [ ] Training requirements tracking

## Governance & Compliance

### Audit & Version Control

- [ ] Complete audit trail for all safety artefacts
- [ ] Version control for hazards
- [ ] Version control for risk assessments
- [ ] Version control for mitigations
- [ ] Version control for safety cases
- [ ] Change attribution
- [ ] Timestamp all changes
- [ ] Immutable historical records
- [ ] Audit trail export

### Roles & Permissions

- [ ] Role-based access control (RBAC)
- [ ] Project Owner role
- [ ] Project Member role
- [ ] Clinical Safety Officer role
- [ ] Reviewer role
- [ ] Public Viewer role
- [ ] Permission inheritance
- [ ] Granular permission controls

### Review & Approval Workflows

- [ ] Review request system
- [ ] Approval workflow engine
- [ ] Sign-off capture
- [ ] Named approver tracking
- [ ] Review comments
- [ ] Conditional approvals
- [ ] Escalation mechanisms

### Incident Management

- [ ] Clinical safety incident model
- [ ] Incident reporting
- [ ] Link incidents to hazards
- [ ] Incident investigation tracking
- [ ] Incident closure workflow

## Reporting & Documentation

### Reports

- [ ] Hazard summary report
- [ ] Risk profile report
- [ ] Safety case report
- [ ] Audit trail report
- [ ] Compliance evidence report
- [ ] DCB0129 compliance report
- [ ] DCB0160 compliance report

### Export & Interoperability

Export is the integration story. The repository itself is the most interoperable
format available - it is a `git clone` away and is plain Markdown - so the work
here is about the formats people ask for on top of that.

- [ ] Export hazard log (CSV/Excel)
- [ ] Single-document download of the whole safety file - phase one, capability 6. One button, serving a document built from the repository. Ports the
      exporter proven in `rcpch/digital-growth-charts-documentation`: Zensical
      build, then WeasyPrint over the rendered HTML
- [ ] Add `libpango-1.0-0` and `libpangoft2-1.0-0` to the web image, which
      WeasyPrint needs
- [ ] Define the safety document's contents as an explicit page list, so adding
      a page to a template cannot silently change what every safety case
      contains. A safety property, not a convenience - the RCPCH exporter keeps
      its controlled subset hard-coded for exactly this reason
- [ ] Cache the built document against the commit it was built from, so a
      download is never served from a different state than the evidence it
      cites. See TH-007
- [ ] Other formats from the same pipeline, `.docx` first
- [ ] Offer the exporter to the community as a Zensical plugin. Zensical has no
      native PDF export
      ([zensical/backlog#25](https://github.com/zensical/backlog/issues/25)), so
      this is a real contribution rather than a courtesy
- [ ] Export safety case (Markdown) - already true: the repository _is_ Markdown
- [ ] Import hazard log
- [ ] Webhook support
- [ ] HTTP API for external integrations. **Deliberately deferred**, not merely
      unscheduled: API-first was withdrawn as a principle in
      [ADR 0002](adr/0002-monolith-over-api-first.md). Build it when a named
      consumer is funded, over `safety_file`, versioned from its first release -
      and revisit the ADR rather than adding one endpoint at a time

## Safety File Storage

Each Clinical Safety Management File is a Git repository on disk holding a Zensical site. See [Architecture Principles](architecture-principles.md#git-is-the-system-of-record). This is foundational: the domain features above depend on it, so it is built first, not last.

### Git as the System of Record

- [x] Repository layout convention, specified in [safety-file-layout.md](safety-file-layout.md)
- [x] Repository creation from a project template
- [x] Read and write safety artefacts as Markdown with YAML frontmatter
- [x] Commit on save, attributed to the acting user
- [x] Sequential identifiers allocated from Git history, never reused
- [x] Validation on read and write, including derived-risk and cross-reference rules
- [x] Generated hazard log, regenerated on every save
- [x] History for a single safety artefact, and retrieval of a past version
- [ ] Diff view between two versions of an artefact
- [x] Database index over repositories, rebuildable from disk - `manage.py reindex_safety_files`, with a test that deletes every row and recovers the index from the repositories alone
- [x] Repository storage layout - one directory per safety file, named for the system, bind-mounted so it is browsable on the host
- [ ] Backup strategy and quotas. The repositories are the only thing that cannot be rebuilt, so this is the one backup that matters
- [ ] Record the organisation in `.turva/manifest.yaml`. It is currently recovered from the mkdocs copyright line during reindex, which works but means a safety file does not state plainly which organisation it belongs to
- [ ] Concurrency: two users editing the same safety file at once
- [ ] Branch management for major changes
- [ ] Merge conflict resolution
- [ ] Tag releases

### Document Generation

- [ ] Build a project's Zensical site from its repository
- [ ] PDF export via WeasyPrint over the built HTML (pattern per <https://growth.rcpch.ac.uk>)
- [ ] PDF cached against the commit it was generated from
- [ ] Generate the safety case report's summary figures from the hazard data rather than prose. While writing the demo safety file, a hand-written residual risk statement claimed all hazards were at risk level 2 or below when two derived level 3 - the same class of defect as TH-001
- [ ] Markdown editor for safety documentation
- [ ] Markdown preview

### Placeholders and Templates

- [ ] A DCB0129 manufacture template. Creating a DCB0129 safety file currently
      scaffolds from the DCB0160 deployment template, which is a closer start
      than nothing but is not the right document set
- [ ] Dynamic placeholder system
- [ ] Auto-population of common fields
- [ ] Context-aware suggestions
- [ ] Safety case templates
- [ ] Hazard templates
- [ ] Risk assessment templates
- [ ] Mitigation templates
- [ ] Template library
- [ ] Template import/export
- [ ] Custom template creation

## User Experience

### Dashboard

- [x] Dashboard layout
- [x] Navigation structure
- [ ] Dashboard widgets
- [ ] Activity feed
- [ ] Notifications
- [ ] Quick actions
- [ ] Search functionality

### UI/UX Improvements

- [ ] Responsive design for mobile
- [ ] Dark mode support
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] User onboarding flow
- [ ] Contextual help system
- [ ] Tooltips and guides

### Dictation / Voice-to-Text

Speech-to-text for long free-text fields (hazard description, mitigation rationale, safety case narrative, meeting notes) where typing is the bottleneck. Run entirely in the browser so no audio or transcript leaves the device, following the pattern behind Discourse's bundled Live plugin's live captions: a quantized NVIDIA Parakeet ASR model via `onnxruntime-web` on WebGPU. See the writeup queued in [`pacharanero/house-style`'s roadmap](https://github.com/pacharanero/house-style/blob/main/roadmap.md) once it lands, and the local-inference principle already stated in [llm-strategy.md](llm-strategy.md#privacy-and-confidentiality).

- [ ] Evaluate `parakeet.js` (MIT, ONNX Runtime Web/WebGPU) or an equivalent library against Turva's no-build-pipeline constraint (HTMX plus vendored JS, no bundler today)
- [ ] Dictation control on long-text fields (hazard description, mitigation rationale, safety case narrative)
- [ ] Clear recording/listening state with a visible stop control; no silent background listening
- [ ] Graceful fallback when WebGPU is unavailable - typing remains the baseline, dictation is additive
- [ ] Confirm the one-time per-user model download (~200-400MB) and WebGPU browser support are acceptable on the target NHS devices before shipping

### Collaboration

- [ ] Commenting on hazards
- [ ] @mentions in discussions
- [ ] Activity notifications
- [ ] Team chat/discussion threads
- [ ] Collaborative editing

## Advanced Features

### AI Access

NHS organisations have well-founded sensitivities about where their data goes
during an LLM round trip, and a deployment safety case is a named
organisation's assessment of its own clinical risk. That constraint, not
capability, decides the order here.

See [llm-strategy.md](llm-strategy.md) for what AI is meant to do once the
access path exists.

- [ ] Bring Your Own API Key, held at profile level - phase one, and the only
      AI path in it
- [ ] Make the data path visible to the user: which provider, which model, what
      was sent
- [ ] MCP server or equivalent, so a customer can drive Turva from an AI client
      they already trust rather than Turva calling out to a model. Inverts the
      data flow, which is the attractive part. Not yet specified; see
      [house-style's MCP standard](https://github.com/pacharanero/house-style/blob/main/mcp.md)
- [ ] Record which content in a safety file was AI-assisted, and never let it
      be mistaken for the CSO's own judgement
- [ ] Turva-hosted inference for paid subscriptions - **not phase one**

### Analytics & Intelligence

- [ ] Risk trend analysis
- [ ] Hazard pattern recognition
- [ ] Predictive risk scoring
- [ ] Cross-project insights
- [ ] Benchmark against similar projects

### Integration & Automation

- [ ] CI/CD pipeline integration
- [ ] Link hazards to code changes
- [ ] Automated hazard triggers on file changes
- [ ] Integration with issue trackers (GitHub, Jira)
- [ ] Integration with version control (GitHub, GitLab)
- [ ] Slack/Teams notifications

### Search & Discovery

- [ ] Full-text search across projects
- [ ] Search public safety cases
- [ ] Import hazards from other projects
- [ ] Hazard recommendation engine
- [ ] Similar hazard detection

### Data Management

- [ ] Data retention policies
- [ ] Archive old projects
- [ ] Data export for compliance
- [ ] Data anonymization
- [ ] Bulk operations

## Testing & Quality

### Code Quality & Formatting

#### Python

- [x] Ruff formatter and linter
- [x] Format-on-save in VS Code
- [x] Line length set to 100 characters
- [x] Import sorting configured
- [ ] Type checking with mypy
- [ ] Docstring linting
- [ ] Complexity analysis

#### Pre-commit Hooks

- [x] Pre-commit framework installed
- [x] Trailing whitespace check
- [x] End-of-file fixer
- [x] YAML/JSON validation
- [x] Spell checking (cspell)
- [x] Python formatting (Ruff)
- [x] Python linting (Ruff)
- [x] Markdown formatting (Prettier)
- [x] Markdown linting (markdownlint)
- [ ] Commit message linting (commitlint)
- [ ] Branch name validation

### Testing

- [x] Unit tests for user model
- [x] Integration tests for authentication
- [x] Integration tests running in CI (previously excluded and silently broken)
- [x] Run the suite against PostgreSQL rather than SQLite. The SQLite-only suite is how an asyncpg incompatibility in the `search_path` connection arguments reached `main` with all 42 tests green
- [ ] Apply migrations automatically on startup, or add a startup check that fails loudly when migrations are pending
- [ ] Coverage reporting in CI with a floor for the risk matrix and permission code
- [ ] Unit tests for all models
- [ ] Integration tests for all endpoints
- [ ] End-to-end tests
- [ ] Performance testing
- [ ] Security testing
- [ ] Accessibility testing
- [ ] Browser compatibility testing

### Documentation

- [x] Specification document
- [x] README
- [x] Architecture decision records ([adr/](adr/))
- [x] Generated reference documentation for the storage layer
- [ ] API documentation (OpenAPI/Swagger) - nothing to document while there is
      no API; see [ADR 0002](adr/0002-monolith-over-api-first.md)
- [ ] User guide
- [ ] Administrator guide
- [ ] Developer guide
- [ ] Deployment guide
- [ ] Security documentation
- [ ] Compliance mapping (DCB0129/DCB0160)

## Deployment & Operations

### Deployment

- [x] Docker Compose setup
- [x] Development environment
- [x] Pin Python dependencies with a resolved lock (`app/requirements*.txt`, `docs/requirements.txt`, regenerate with `s/lock`)
- [x] Pin every GitHub Action to a commit SHA
- [ ] Production deployment configuration
- [ ] Pin version numbers for all Docker images (PostgreSQL, Python, Caddy) before production
- [ ] Pin docs dependencies (`docs/requirements.txt` is currently unpinned)
- [ ] Kubernetes deployment
- [ ] Database backup strategy
- [ ] Disaster recovery plan
- [ ] High availability setup
- [ ] Load balancing

### Monitoring & Operations

- [ ] Application logging
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database monitoring
- [ ] Security monitoring
- [ ] Automated backups
- [ ] Health check endpoints

### Security

- [ ] Security audit
- [ ] Penetration testing
- [ ] HTTPS enforcement
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Content Security Policy
- [ ] Security headers

## Compliance & Certification

### Standards Compliance

- [ ] DCB0129 alignment verification
- [ ] DCB0160 alignment verification
- [ ] GDPR compliance
- [ ] ISO 13485 considerations
- [ ] ISO 14971 alignment (risk management)
- [ ] Regulatory documentation

### Certification & Audit

- [ ] Internal audit process
- [ ] External audit preparation
- [ ] Certification documentation
- [ ] Compliance evidence generation

## Future Considerations

### Extensibility

- [ ] Plugin system
- [ ] Custom safety artefact types
- [ ] Custom workflow definitions
- [ ] Custom report templates
- [ ] HTTP API for third-party integrations (see Export & Interoperability above)

### Internationalization

- [ ] Multi-language support
- [ ] Localized risk matrices
- [ ] Regional compliance variations

### Advanced Governance

- [ ] Delegated authority tracking
- [ ] Multi-level approval chains
- [ ] Automated compliance checks
- [ ] Policy enforcement engine

---

**Last Updated:** 10 October 2026
**Current Phase:** Funded phase one - see [Phase One Scope](phase-one-scope.md)
**Next Milestone:** Hazard creation and editing, then the Zensical/WeasyPrint PDF

Note on reading this roadmap: it tracks everything Turva might eventually do, and is much wider than the funded build. [Phase One Scope](phase-one-scope.md) is the authoritative list of what ships by Christmas.
