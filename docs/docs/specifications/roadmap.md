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

### Frontend Infrastructure

- [x] React with TypeScript
- [x] Vite build system
- [x] Mantine UI component library
- [x] Authentication pages (Login, Register, Verify)
- [x] Dashboard layout structure
- [x] Routing setup
- [ ] Error boundary handling
- [ ] Loading states and skeletons
- [ ] Offline support

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

## VMPT Stack Features

### Version Control (V)

- [ ] Git-based version control for safety documents
- [ ] Branch management for major changes
- [ ] Merge conflict resolution
- [ ] Tag releases

### Markdown (M)

- [ ] Markdown editor for safety documentation
- [ ] Markdown preview
- [ ] Markdown templates
- [ ] Rich text formatting support

### Placeholders (P)

- [ ] Dynamic placeholder system
- [ ] Auto-population of common fields
- [ ] Context-aware suggestions

### Templates (T)

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

### Testing

- [x] Unit tests for user model
- [x] Integration tests for authentication
- [ ] Unit tests for all models
- [ ] Integration tests for all endpoints
- [ ] End-to-end tests (frontend)
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
- [ ] Production deployment configuration
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

**Last Updated:** 15 January 2026  
**Current Phase:** Foundation & Infrastructure  
**Next Milestone:** Core Domain Features (Projects & Hazards)
