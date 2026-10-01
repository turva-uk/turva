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

Interface, business rules, and storage are logically separated:

- The interface layer focuses on user experience, and is server-rendered from the application that enforces the rules
- The application enforces business rules and data integrity, and owns all Git operations
- Git repositories hold the safety evidence
- The database indexes those repositories and holds operational state such as users, sessions, and permissions

**Why**: Enables independent evolution and testing of each concern. Note that separation here is about responsibility, not deployment: phase one deliberately serves the interface from the same process as the API, because maintaining a second codebase for the same screens was costing more than it returned.

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

### Git Is the System of Record

Each Clinical Safety Management File is its own Git repository on disk, holding a documentation site in Markdown. This is the defining architectural decision of the platform and it is not negotiable without revisiting everything else here.

- Safety evidence is files in a repository, not rows in a table
- The audit trail is the commit history: attributed, timestamped, and tamper-evident
- The database is an **index over** those repositories, not the truth. It exists so projects can be listed, searched, and permission-checked quickly, and it must be rebuildable from the repositories
- No safety evidence may exist only in the database
- Generated documents, including the safety case PDF, are build artefacts reproducible from the commit they came from
- The web application performs Git operations on the user's behalf; the Clinical Safety Officer never sees a commit, branch, or merge

**Why**: Regulators and courts need an audit trail that cannot be quietly rewritten. A database row can be updated in place; a commit cannot be altered without detection. Git also gives branching for review, diffing of safety decisions, and distribution for federation, none of which a table provides. The structure resembles a code-hosting platform rather than a conventional web application, which is unusual enough to be worth stating plainly.

This was previously documented in `archive/architecture/vmpt.md` and was lost in the December rationalisation, which removed the "VMPT stack" framing. Dropping the framing was right; dropping the architecture was not.

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

- Safety evidence lives in the project's Git repository, never duplicated into the database as its own truth
- User details in the user table (not duplicated into project records)
- Risk matrix defined once (not per-project)
- Derived values calculated on read (not stored stale)

**Why**: Eliminates inconsistency and simplifies updates.

## Security Principles

### Defence in Depth

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

### Storage Scaling

The database holds the index and operational state, so it is comparatively small and read-heavy:

- Index appropriately, and optimise queries when measurement says to
- Consider read replicas for reporting
- Remember the index is derivable: it can be rebuilt from the repositories, which makes it cheap to change

Filesystem and Git operations are the more likely bottleneck, since every project read or write touches a repository:

- Repository operations are I/O bound; prefer plumbing commands over spawning full Git processes where it matters
- Large repositories and long histories degrade differently from large tables, and need their own measurement
- Generated artefacts such as PDFs should be cached against the commit they were built from, not rebuilt per request

**Why**: Treating the database as the bottleneck would misdirect optimisation effort. The evidence lives on disk, so that is where the contention will be.

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

These principles guide implementation choices. Specific technologies (FastAPI, HTMX, PostgreSQL, Zensical) are current implementations, not architectural requirements, and code should follow these principles regardless of tech stack.

Git is the exception. "Git is the system of record" is an architectural requirement, not an implementation detail - it is where the regulatory-grade audit trail comes from, and substituting a database for it would change what the product is.
