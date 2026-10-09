# Architecture Principles

Turva's architecture is guided by principles, not specific technologies. Implementation details live in the codebase.

Two decisions are load-bearing enough that the rest of this document assumes them:

- **Git is the system of record.** Each Clinical Safety Management File is its own Git repository. The database is a rebuildable index over those repositories. See [Git Is the System of Record](#git-is-the-system-of-record).
- **The application is a monolith.** One Django process renders the pages, enforces the rules, and performs the Git operations. There is no separate frontend and no general-purpose HTTP API. See [ADR 0002](adr/0002-monolith-over-api-first.md).

## Core Principles

### 1. Safety as a First-Class Concern

Safety information must be:

- Structured and consistent
- Versioned with complete history
- Attributed to named individuals
- Immutable (changes create new versions, don't overwrite)

**Why**: Clinical safety requires audit trails that can withstand regulatory scrutiny and legal challenge.

### 2. Separation of Responsibility, Not of Deployment

Interface, business rules, and storage are separate responsibilities inside one application:

- **Templates** render; they do not reach past the view to a repository or run a query of their own
- **Views** handle HTTP, authorisation and form validation; they do not implement safety rules
- **The storage layer** (`safety_file/`) owns the safety rules and is the only code that reads or writes a safety file. No framework imports
- **Git repositories** hold the safety evidence
- **The database** indexes those repositories and holds operational state: users, sessions, permissions

**Why**: These boundaries are about where a rule lives, not about how many processes run. Keeping the safety rules in a library below the view layer means they cannot be bypassed by a handler that forgets to call something, and it is what let the application move from FastAPI to Django without touching them.

Deployment is deliberately _not_ separated. One process serves everything. Splitting it would add a boundary for safety rules to leak across and audit records to go missing at, in exchange for scaling we do not need. See [ADR 0002](adr/0002-monolith-over-api-first.md).

### 3. One Application, Server-Rendered

The application renders its own HTML. There is no separate frontend and no general-purpose HTTP API:

- Pages are Django templates, progressively enhanced with HTMX
- HTMX endpoints return HTML fragments coupled to the templates that request them, and may change without notice. They are interface, not API
- `/healthz/` returns JSON for monitoring. Nothing is promised about its shape
- Integration in phase one is by export: the safety case PDF, and the repository itself, which is a `git clone` away

**Why**: This replaces an "API-First Design" principle that was written when a React single-page application was the only consumer. That frontend is gone, and the principle outlived its beneficiary - it would have required building and versioning a JSON API during a twelve-week funded build, for clients nobody asked for.

The extensibility it was protecting is better protected where it now sits. `safety_file/` is a framework-free library that owns the safety invariants, so if a second client is ever funded, an HTTP layer goes over the same core - and because the core holds the rules, that layer cannot weaken them. An API is a surface a handler can forget to validate; a library that owns its invariants is not.

Federation does not need a JSON API either: its vocabulary is fork, pull request, diff and lineage, which is Git. See [ADR 0002](adr/0002-monolith-over-api-first.md) for the full reasoning and the review trigger.

### 4. Auditability by Default

Every state-changing operation creates an audit record:

- Who performed the action
- When it occurred
- What changed (before/after)
- Why (justification if required)

**Why**: Regulatory compliance, accountability, and trust require complete traceability.

### 5. Validate at the Boundary, Reject Rather Than Coerce

Python has no compile-time guarantees, so correctness comes from refusing bad data at each boundary it crosses:

- The database schema enforces constraints: uniqueness, nullability, foreign keys
- Forms validate what arrives from a browser
- The storage layer validates every safety artefact on read _and_ on write, and will not write an invalid one
- Configuration rejects malformed environment values rather than defaulting. A `DEBUG=yes` that quietly evaluates to False is a production incident
- Invalid values are rejected, never coerced. A severity of `"4"` is a data-quality problem upstream, not a 4, and accepting it hides whatever produced a string

**Why**: In a safety record, silently repaired data is worse than rejected data: it looks like evidence and is not. The earlier version of this principle described a TypeScript frontend type-checking an API response, which no longer describes anything that exists.

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
- Every safety artefact shows who last changed it and when, because that is read from the commit history rather than assembled separately

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
3. Authorisation (role-based access control)
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

- HTTPS required (HTTP redirects to HTTPS), with HSTS outside development
- Sessions have reasonable expiration (not infinite), and session and CSRF cookies are secure and HTTP-only
- Passwords require minimum strength, and are hashed with Argon2
- CSRF protection on every state-changing request. A same-origin monolith needs this rather than the CORS policy a separate frontend required

**Why**: Users shouldn't have to opt into security.

## Performance Principles

### Optimise for the Common Case

Common workflows should be fast:

- Viewing hazard log: <500ms
- Creating new hazard: <1s
- Searching projects: <2s

Rare operations (exporting full audit trail) can be slower.

**Why**: User experience depends on perceived performance of frequent actions.

### Long Operations Need an Answer, Not Necessarily a Queue

Some operations are slow: building a Zensical site and rendering it to PDF, importing a large hazard log, a bulk update.

Phase one has **no task queue**, and runs these in the request. That is a known constraint, not an oversight:

- A PDF is generated from a specific commit, so the result is cacheable against that commit SHA and the second request is free
- A safety file with tens of hazards builds in well under a request timeout, and the funded deployment is twelve practices
- Adding Celery or similar means a broker, a worker container, and a second failure mode, for a problem not yet measured

**Why**: The honest position is that this will need revisiting before it needs scaling, and the trigger is measurement - a PDF build that approaches the proxy timeout - not anticipation. Recorded so that the first slow PDF is recognised as the expected signal rather than a surprise.

### Cache Wisely

Cache data that changes infrequently:

- Risk matrix (static)
- User profile (changes rarely)
- Project metadata (changes occasionally)

Don't cache hazard data (changes frequently and must be current).

**Why**: Reduces database load without serving stale safety data.

## Testing Principles

### Test at Multiple Levels

- **Storage layer**: the safety rules, tested with no database, no framework and no container. Fast, and it fails first when the architectural core breaks
- **Application**: views, forms and authentication through Django's test client, against **PostgreSQL**
- **End to end**: complete user workflows, and building the demo safety file through the production storage layer

**Why**: Each level catches different errors, and the first level is fast enough to run constantly because it was kept free of infrastructure.

Test against the engine that is deployed. The suite once ran on SQLite while production used PostgreSQL, and a PostgreSQL connection regression reached the main branch with every test passing. A suite that exercises a different database than the one shipped is a false signal.

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

- Container definitions (Dockerfile), with base images pinned to exact patch versions
- Service orchestration (docker-compose.yml)
- Database schema (Django migrations)
- Dependencies declared in `.in` files and resolved into committed locks

**Why**: Reproducible deployments, reviewable changes, rollback capability.

The funded deployment is a single VPS running Docker Compose: Caddy, the Django application, PostgreSQL, and a volume holding the safety file repositories. Kubernetes is not in phase one, and the orchestration files should not pretend otherwise.

### Separate Config from Code

Configuration lives in environment variables, not hardcoded:

- Database connection strings
- API keys
- Feature flags

**Why**: Same code runs in dev, staging, and production with different config.

### Deploy Without Losing Evidence

A single VPS running one application process cannot deploy with zero downtime, and phase one does not try to. What it must not do is lose or corrupt safety evidence while restarting:

- Migrations are backward-compatible where practical, so a rollback does not strand the database
- The safety file repositories live on a volume that outlives the container, and are what the backup strategy must cover. The database is rebuildable from them; they are not rebuildable from anything
- A restart interrupts in-flight requests. Because every write is committed as it is made rather than batched at the end of a session, an interrupted request loses at most the edit in progress, not the file

**Why**: The earlier version of this principle promised rolling updates, backward-compatible API versioning and high availability. None of that is true of a single VPS, and claiming it would mislead whoever plans the first deployment. Availability is a legitimate later goal; evidence durability is a requirement now.

A brief outage during a deploy is acceptable for a tool used by Clinical Safety Officers during office hours. It would not be acceptable for a system used at the point of care, which Turva explicitly is not.

## Scalability Principles

### Stateless Application Processes

The application stores no state in process memory:

- Sessions live in PostgreSQL, not in memory, so a restart does not sign everyone out
- Any worker can serve any request
- Generated artefacts are cached against a commit SHA, not held per process

**Why**: It keeps restarts cheap today, which is the immediate benefit, and leaves horizontal scaling available later without a rewrite.

Note the limit: the safety file repositories are on local disk, so adding a second machine is not simply a matter of another process. It would need shared storage, or routing each safety file to a consistent host. That is a real constraint of choosing Git as the system of record, and it is worth knowing before anyone promises a cluster.

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

Start simple - single database, single application process, no task queue, no cache server:

- Add complexity only when measurement requires it
- Measure before optimising
- Optimise the bottleneck, not whatever is most interesting

**Why**: Premature optimisation adds complexity without benefit, and every added component is another thing that can fail while holding safety evidence. The funded deployment serves twelve GP practices; a design for that is the right design to build.

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

**Why**: Avoid vendor lock-in, support on-premises deployment, optimise cost/performance.

### The Storage Layer Is a Library, and Stays One

`safety_file/` imports no web framework and is the only code that reads or writes a safety file. That is the project's main extension point:

- A new interface - an HTTP API, a CLI, a scheduled job - is built over it rather than beside it
- Because the library owns the safety invariants, a new interface cannot weaken them
- It is testable with no database, no server and no container, which is why that suite runs in two seconds

**Why**: This replaces an "API Extensibility" principle about versioned endpoints and deprecation timelines, which had no referent once API-first was withdrawn ([ADR 0002](adr/0002-monolith-over-api-first.md)).

It has already earned its keep: the library survived the move from FastAPI to Django untouched. The constraint is worth defending for that reason alone - the next time the framework question is reopened, this is the part that does not need reconsidering.

### Schema Versioning for Safety Files

A safety file records the schema version it was written with, in `.turva/manifest.yaml`. The on-disk layout is the long-lived contract: repositories outlive application versions, and a file created today must still be readable years later.

- A file with a newer schema version than the code understands is **refused**, not opened. Opening it could silently drop fields it does not recognise
- Changing the layout means bumping the version and providing an upgrade path, not editing the specification

**Why**: Regulatory evidence has to be readable for as long as it must be retained, which is longer than any particular release of Turva will live. See [safety-file-layout.md](safety-file-layout.md).

---

These principles guide implementation choices. Specific technologies - Django, HTMX, PostgreSQL, Zensical, Caddy - are current implementations, not architectural requirements. The framework has already changed once ([ADR 0001](adr/0001-use-django-for-phase-one.md)), which is the argument for writing principles rather than a stack.

Two things are not implementation details:

- **Git is the system of record.** It is where the regulatory-grade audit trail comes from, and substituting a database for it would change what the product is.
- **The safety rules live in a library below the interface.** Not which library, or which framework calls it - but that the invariants sit beneath whatever serves HTTP, so no handler can skip them.

Everything else here is revisable on evidence. Where a principle is revised, record the reversal rather than deleting it: the Git architecture was lost once because a document was rewritten without one. ADRs live in [adr/](adr/).
