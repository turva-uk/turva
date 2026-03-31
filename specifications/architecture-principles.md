# Architecture Principles

Turva's architecture is guided by principles, not specific technologies. Implementation details live in the codebase.

## Core Principles

### 1. Safety as a First-Class Concern

Safety information must be:
- Structured and consistent
- Versioned with complete history
- Attributed to named individuals
- Immutable (changes create new versions, don't overwrite)

**Why**: Clinical safety requires audit trails that can withstand regulatory scrutiny and legal challenge.

### 2. Separation of Concerns

Frontend, backend, and data storage are logically separated:
- Frontend focuses on user experience
- Backend enforces business rules and data integrity
- Database provides persistent, queryable storage

**Why**: Enables independent evolution, testing, and scaling of each layer.

### 3. API-First Design

All functionality is exposed via API:
- Frontend is one client among many (mobile app, CLI, integrations could be others)
- API is versioned and documented
- Breaking changes are managed with deprecation periods

**Why**: Supports future clients, third-party integrations, and federation between Turva instances.

### 4. Auditability by Default

Every state-changing operation creates an audit record:
- Who performed the action
- When it occurred
- What changed (before/after)
- Why (justification if required)

**Why**: Regulatory compliance, accountability, and trust require complete traceability.

### 5. Type Safety Where Possible

Use type systems to catch errors at compile time:
- Database schema enforces constraints
- API contracts define request/response shapes
- Frontend type-checks data from API

**Why**: Reduces runtime errors, improves developer confidence, and makes refactoring safer.

### 6. Fail Secure

Security and safety failures default to restrictive:
- Authentication failures reject access (don't assume authenticated)
- Invalid risk assessments reject submission (don't default to "low risk")
- Missing data prevents completion (don't silently skip)

**Why**: Healthcare systems must err on the side of safety.

### 7. Transparency as Default

Information is public unless there's a specific reason for privacy:
- Projects default to public visibility
- Audit logs are accessible to project members
- API responses include metadata (who, when, version)

**Why**: Openness builds trust and enables federation of safety knowledge.

## Data Principles

### Immutable Audit Records

Once a safety decision is recorded, the historical record is permanent:
- Corrections create new versions, don't overwrite
- Deletions are soft deletes (marked deleted, not removed)
- Version control provides immutable history

**Why**: Safety decisions are time-bound to system state. Historical context must be preserved.

### Derived, Not Entered

Risk level is calculated from severity and likelihood, not manually selected:
- Users cannot arbitrarily assign risk levels
- Changes to severity or likelihood recalculate risk level automatically
- Formula is auditable and consistent

**Why**: Prevents subjective downgrading of serious risks.

### Single Source of Truth

Each piece of information has one canonical location:
- User details in user table (not duplicated in project records)
- Risk matrix defined once (not per-project)
- Derived values calculated on read (not stored stale)

**Why**: Eliminates inconsistency and simplifies updates.

## Security Principles

### Defense in Depth

Security happens at multiple layers:
1. Network (TLS, firewall)
2. Authentication (session validation)
3. Authorization (role-based access control)
4. Input validation (reject malformed data)
5. Output encoding (prevent injection attacks)

**Why**: No single layer is infallible; multiple layers provide resilience.

### Principle of Least Privilege

Users and services have minimum permissions required:
- Read-only access where write isn't needed
- Project-scoped permissions (can't access other projects)
- Time-limited sessions (automatic expiration)

**Why**: Limits blast radius of compromised accounts.

### Secure by Default

Security features are on by default, not opt-in:
- HTTPS required (HTTP redirects to HTTPS)
- Sessions have reasonable expiration (not infinite)
- Passwords require minimum strength
- CORS restricted to known origins

**Why**: Users shouldn't have to opt into security.

## Performance Principles

### Optimize for Common Case

Common workflows should be fast:
- Viewing hazard log: <500ms
- Creating new hazard: <1s
- Searching projects: <2s

Rare operations (exporting full audit trail) can be slower.

**Why**: User experience depends on perceived performance of frequent actions.

### Async Where Beneficial

Long-running operations run asynchronously:
- Generating PDF safety case report
- Importing large hazard logs
- Bulk updates

User receives immediate feedback, operation completes in background.

**Why**: Keeps UI responsive, prevents timeouts.

### Cache Wisely

Cache data that changes infrequently:
- Risk matrix (static)
- User profile (changes rarely)
- Project metadata (changes occasionally)

Don't cache hazard data (changes frequently and must be current).

**Why**: Reduces database load without serving stale safety data.

## Testing Principles

### Test at Multiple Levels

- **Unit tests**: Individual functions and components
- **Integration tests**: API endpoints with database
- **End-to-end tests**: Complete user workflows

Each level catches different types of errors.

**Why**: Comprehensive coverage requires testing at all levels.

### Test Safety-Critical Paths

Risk assessment calculation, audit trail generation, and permission checks must have 100% coverage.

**Why**: These are non-negotiable for clinical safety and regulatory compliance.

### Fast Feedback

Tests should run quickly:
- Unit tests: <5s for entire suite
- Integration tests: <30s
- E2E tests: <5min

**Why**: Slow tests discourage running them frequently.

## Deployment Principles

### Infrastructure as Code

Infrastructure defined in version-controlled files:
- Container definitions (Dockerfile)
- Service orchestration (docker-compose.yml, Kubernetes manifests)
- Database schema (migrations)

**Why**: Reproducible deployments, reviewable changes, rollback capability.

### Separate Config from Code

Configuration lives in environment variables, not hardcoded:
- Database connection strings
- API keys
- Feature flags

**Why**: Same code runs in dev, staging, and production with different config.

### Zero-Downtime Deployments

New versions deploy without interrupting service:
- Rolling updates (bring up new instance before shutting down old)
- Database migrations backward-compatible
- API versioning supports old and new clients simultaneously

**Why**: Healthcare systems require high availability.

## Scalability Principles

### Stateless API Servers

API servers store no local state (sessions in database, not memory):
- Any server can handle any request
- Servers can be added or removed dynamically
- Load balancing is straightforward

**Why**: Enables horizontal scaling.

### Database as Bottleneck

Assume database will be the scaling bottleneck:
- Optimize queries early
- Index appropriately
- Consider read replicas for reporting

**Why**: Databases are hardest to scale; minimize load on them.

### Scale When Needed, Not Prematurely

Start simple (single database, single API server):
- Add complexity only when performance requires it
- Measure before optimizing
- Optimize the bottleneck, not random code

**Why**: Premature optimization adds complexity without benefit.

## Extensibility Principles

### New Safety Artefacts

Domain model supports new artefact types:
- Incident reports
- Compliance checklists
- Third-party assessments

New types inherit core properties (versioning, audit, ownership).

**Why**: Clinical safety practice evolves; platform must adapt.

### Pluggable LLM Backends

LLM integration supports multiple providers:
- OpenAI GPT
- Anthropic Claude
- Local models (Llama, Mistral)
- Custom fine-tuned models

**Why**: Avoid vendor lock-in, support on-premises deployment, optimize cost/performance.

### API Extensibility

API versioning allows backward-compatible evolution:
- New endpoints added without breaking old clients
- New fields added to responses (old clients ignore them)
- Deprecated endpoints given sunset timeline

**Why**: Deployed clients can't all update simultaneously.

---

These principles guide implementation choices. Specific technologies (React, FastAPI, PostgreSQL) are current implementations, not architectural requirements. Code should follow these principles regardless of tech stack.
