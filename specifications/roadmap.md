# Turva Development Roadmap

This roadmap tracks the implementation status of Turva features based on the [specification](spec.md). Features are organized by domain area and marked with checkboxes to indicate completion status.

## Foundation & Infrastructure

### User Management & Authentication

- [x] User model with password hashing (Argon2)
- [x] User registration endpoint
- [x] User login endpoint
- [x] Email verification system
- [x] Session management
- [x] Authentication middleware
- [x] JWT-based authentication
- [ ] Password reset functionality
- [ ] User profile management
- [ ] Professional registration tracking
- [ ] Clinical Safety Officer designation

### Database & Data Layer

- [x] PostgreSQL database setup
- [x] Alembic migrations
- [x] User table
- [x] Session table
- [ ] Organization table
- [ ] Project table
- [ ] Hazard table
- [ ] Risk assessment table
- [ ] Mitigation table
- [ ] Safety case table
- [ ] Audit trail table
- [ ] Change record table

### API Infrastructure

- [x] FastAPI framework setup
- [x] Docker containerization
- [x] NGINX reverse proxy
- [x] Gunicorn WSGI server
- [x] CORS middleware
- [ ] Rate limiting
- [ ] API versioning
- [ ] OpenAPI documentation

### Interface Infrastructure

The React/Mantine/Vite frontend was removed to avoid building every screen twice. Jinja2 templates served by FastAPI, progressively enhanced with HTMX, replace it. The React authentication pages remain in Git history as a reference for the equivalent HTMX flows.

- [x] Removed React, Mantine, Vite, Storybook and the separate frontend build
- [ ] Jinja2 template layer and base layout
- [ ] HTMX wiring and partial-response conventions
- [ ] Authentication pages (Login, Register, Verify)
- [ ] Dashboard layout structure
- [ ] Error and empty states
- [ ] Accessibility pass (WCAG 2.2 AA)

## Core Domain Features

### Projects

- [ ] Create new project
- [ ] Project listing (My Projects)
- [ ] Project listing (Community/Public Projects)
- [ ] Project details page
- [ ] Edit project information
- [ ] Project visibility settings (public/private)
- [ ] Project archival
- [ ] Project ownership transfer
- [ ] Project team member management
- [ ] Project permissions system

### Organizations

- [ ] Organization model
- [ ] Create organization
- [ ] Organization profile
- [ ] Organization settings
- [ ] Link Clinical Safety Officers to organizations
- [ ] Multi-organization support for users

### Hazards

- [ ] Hazard model with versioning
- [ ] Create hazard
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

- [ ] Export hazard log (CSV/Excel)
- [ ] Export safety case (PDF)
- [ ] Export safety case (Markdown)
- [ ] Import hazard log
- [ ] API for external integrations
- [ ] Webhook support

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
- [ ] Database index over repositories, rebuildable from disk
- [ ] Repository storage layout, quotas and backup strategy
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

### Collaboration

- [ ] Commenting on hazards
- [ ] @mentions in discussions
- [ ] Activity notifications
- [ ] Team chat/discussion threads
- [ ] Collaborative editing

## Advanced Features

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
- [ ] Run the suite against PostgreSQL as well as SQLite. Tests currently use SQLite only, so Postgres-specific regressions are invisible to CI - an asyncpg 0.31 incompatibility in the `search_path` connection arguments reached `main` with all 42 tests green
- [ ] Apply migrations automatically on startup, or add a startup check that fails loudly when migrations are pending
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
- [ ] API documentation (OpenAPI/Swagger)
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
- [x] Pin Python dependencies with a resolved lock (`api/requirements*.txt`, regenerate with `s/lock`)
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
- [ ] API for third-party integrations

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

**Last Updated:** 2 October 2026
**Current Phase:** Funded phase one - see [Phase One Scope](phase-one-scope.md)
**Next Milestone:** Django port, then project creation through the web interface

Note on reading this roadmap: it tracks everything Turva might eventually do, and is much wider than the funded build. [Phase One Scope](phase-one-scope.md) is the authoritative list of what ships by Christmas.
