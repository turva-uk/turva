# ADR 0002: A monolith, not an API-first platform

- **Status**: Accepted
- **Date**: 2026-10-09
- **Decision-maker**: Marcus Baw
- **Supersedes**: the "API-First Design" principle in [architecture-principles.md](../architecture-principles.md)
- **Related**: [ADR 0001](0001-use-django-for-phase-one.md)

## Context

`architecture-principles.md` carried this as its third core principle:

> **API-First Design.** All functionality is exposed via API. Frontend is one client among many (mobile app, CLI, integrations could be others). API is versioned and documented.

That was reasonable when it was written. Turva then had a React single-page application talking to a FastAPI backend over JSON, so an API was not an aspiration - it was the only way the frontend could get data.

Two things have changed since:

1. The React frontend was removed, because specifying, building and testing every screen twice - once as a component against a JSON contract, once as the endpoint serving it - cost more than it returned.
2. [ADR 0001](0001-use-django-for-phase-one.md) moved the application to Django, which renders its own pages.

So the client that made the API necessary no longer exists, and the principle now describes an obligation with no beneficiary. Left in place it would require building and versioning a general-purpose HTTP API during a twelve-week funded build, for consumers that are not in scope and have not been asked for.

## Decision

Phase one is a monolith. One Django application renders the HTML, enforces the business rules, and performs the Git operations.

There is no general-purpose HTTP API, no versioned endpoints, no serialisation layer, and no OpenAPI schema. "API-first" is withdrawn as a principle.

Two things that look like exceptions are not:

- **`/healthz/`** returns JSON. It is a liveness and readiness probe for the reverse proxy and monitoring, not a client contract, and nothing is promised about its shape.
- **HTMX fragment endpoints** will exist as the interface grows. They return HTML fragments, are coupled to the templates that request them, and are free to change without notice. They are part of the interface, not an API.

## Rationale

**The cost of API-first is paid now; the benefit arrives for a consumer that does not exist.** A versioned API means serialisation, contract tests, documentation, deprecation policy, and a second representation of every object to keep in step with the first. None of the six phase-one capabilities needs any of it. The sponsor asked for a web portal and a PDF.

**The extensibility it was protecting is already better protected somewhere else.** This is the substantive point. `safety_file/` is a framework-free Python library with a clean boundary, and it is the only code that may read or write a safety file. The invariants that matter - risk level derived rather than entered, identifiers never reused, every write committed and attributed - are enforced _below_ the HTTP layer.

That is a stronger position than a REST API would give us. An API is a surface that can be made to bypass domain rules if a handler forgets to call something; a library that owns its invariants cannot be. If a second client is ever funded, the answer is an API layer over the same core - and because the core already holds the rules, that API cannot weaken them. Deferring the API costs us the option; it does not cost us the architecture.

**Federation does not need a JSON API.** This was the principle's strongest justification - "supports federation between Turva instances" - and it does not survive inspection. Read [federation.md](../federation.md) and the vocabulary is fork, pull request, diff, merge, lineage, sync state. That is Git. Inheriting a manufacturer's safety case is cloning a repository; contributing a hazard back is a pull request; "which upstream version is this fork based on?" is a commit SHA. Federation is a repository-level protocol that Git already implements, and building it over HTTP JSON would mean reimplementing distribution that we get for free by having chosen Git as the system of record.

**Simplicity is a safety property here, not just a convenience.** Every layer is somewhere a safety rule can be bypassed or an audit record lost. One process, one set of rules, one place where a hazard is written is easier to reason about and easier to show a reviewer than the same logic split across a serialisation boundary. For a tool whose output is regulatory evidence, "I can explain exactly where this was validated" has real value.

## Consequences

**Accepted:**

- No machine-readable API for third parties during phase one. Recorded as deferred in [phase-one-scope.md](../phase-one-scope.md) and [roadmap.md](../roadmap.md) rather than silently dropped.
- A future mobile app, CLI, or external integration needs an API layer built. That cost is deferred, not avoided, and the ADR should be revisited rather than the API bolted on by one endpoint at a time.
- No automatic OpenAPI documentation. There is nothing to document.
- Export remains the integration story for phase one: the safety case PDF, and the repository itself, which is a Git clone away and the most interoperable format available.

**Retained:**

- The storage layer stays a library with no framework imports. That constraint is now doing double duty - it survived a framework change, and it is what makes an API addable later without rewriting the rules.
- Separation of _responsibility_ between interface, rules and storage. The monolith is about deployment topology, not about letting a template write to a repository directly.

## Alternatives considered

**Keep API-first.** Rejected. It would mean building a JSON representation of every safety artefact, versioning it, and testing both it and the HTML, inside a twelve-week build, to serve nobody.

**API-first for a subset - say, read-only hazard export.** Rejected for now, though it is the most plausible first step if the ADR is revisited. Half an API still needs versioning, documentation and contract tests; it pays most of the cost for a fraction of the benefit. If an integration is actually contracted, build the part it needs then.

**Keep the principle but mark it aspirational.** Rejected. A principle nobody follows teaches readers that the principles document is decorative, which is how the Git architecture came to be dropped without anyone noticing - see the note in [architecture-principles.md](../architecture-principles.md) about the December rationalisation.

## Review trigger

Revisit when a second client or an external integration becomes a funded requirement: a mobile application, a CLI, a federated Turva instance exchanging data over anything other than Git, or an NHS organisation contracting for machine-readable export.

At that point the design question is narrow and already answered in outline: an HTTP layer over `safety_file`, serving one named consumer, versioned from its first release.
