# ADR 0001: Use Django for the phase-one build

- **Status**: Accepted
- **Date**: 2026-10-02
- **Decision-maker**: Marcus Baw
- **Supersedes**: the implicit FastAPI choice recorded throughout `specifications/`

## Context

Phase one ([phase-one-scope.md](../phase-one-scope.md)) must ship by Christmas 2026. The existing implementation is FastAPI with Ormar and Alembic: roughly 2,000 lines, almost all of it authentication, with 42 passing tests.

The React frontend was removed in favour of server-rendered templates with HTMX, so the application now renders its own HTML. That changes which framework fits.

What phase one actually requires:

| Capability             | What it needs                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| Web-based sign-on      | Registration, login, email verification, **password reset** (not yet built) |
| Shell project creation | Forms, file and Git operations on disk                                      |
| AI-assisted discovery  | HTTP calls to an LLM, BYOK key handling                                     |
| Customer hand-off      | Scoped, temporary, object-level permissions for a second role               |
| Risk management        | Forms, validation, a guided multi-step workflow                             |
| Formal PDF             | Zensical build then WeasyPrint over the built HTML                          |

## Decision

Rebuild the application on Django for phase one.

## Rationale

**The work is forms, permissions and files, not an API.** Django ships authentication, password reset, sessions, forms, an object-level permission story, templates, CSRF protection, and an admin interface. Phase one needs all of them. FastAPI supplies none of them and each would be hand-rolled under deadline. The password reset that is still an open roadmap item is free in Django.

**The expensive operations are blocking.** Git operations and WeasyPrint rendering are blocking I/O and CPU work. Under FastAPI's async-first model each one needs offloading to a threadpool to avoid stalling the event loop - a correctness detail that is easy to get wrong and invisible in testing until it is slow in production. Django's synchronous request model is the natural fit, and a worker per request is appropriate for an application whose unit of work is "run Git over a repository".

**An admin interface has real operational value.** A single-maintainer deployment supporting a GP Federation needs a way to inspect users, fix a stuck hand-off, and see what state a project is in, without writing a screen for each. Django gives that on day one.

**Turva is not an API product in phase one.** `architecture-principles.md` argues for API-first design so other clients can exist. That remains a good long-term goal, and Django REST Framework or Django Ninja can serve it later. It is not what the funded build needs, and the cost of generality is being paid now for a benefit that arrives after Christmas.

## Consequences

**Accepted costs**, estimated at one to two weeks of the twelve:

- Port the `User` and `Session` models. Django's `AbstractUser` replaces most of the custom user model; Django's session framework replaces the custom session table and middleware.
- Rewrite the authentication endpoints as Django views. Most of this is deletion: `django.contrib.auth` provides login, logout, and password reset.
- Replace Alembic with Django migrations. The existing three migrations describe tables that Django will own, so this is a fresh initial migration rather than a translation.
- Port the 42 tests to Django's test client and pytest-django.
- Update `specifications/`, `AGENTS.md`, `copilot-instructions.md`, and the docs site, all of which name FastAPI.
- Lose the automatic OpenAPI schema. Acceptable: there is no external API consumer in phase one.

**Retained regardless of framework:**

- The Git storage layer is written as a plain Python package with no framework imports. It is the architectural core, it is independently unit-testable, and it would survive another framework change.
- The domain rules: derived risk level, the severity and likelihood scales, Git as the system of record.
- The Zensical and WeasyPrint document pipeline, which is a subprocess and a library call.

**Deployment**, confirmed for this decision: a VPS running Docker Compose with Caddy, the Django application container, a filesystem volume for safety file repositories, and PostgreSQL. Filesystem access is a first-class requirement, not an afterthought, because the repositories _are_ the data.

## Alternatives considered

**Stay on FastAPI.** Keeps the existing auth and avoids a port. Rejected because the saving is smaller than it appears - the retained code is mostly the part Django replaces for free - and because every remaining phase-one capability is one Django already answers. The threadpool discipline required for Git and PDF work is a persistent source of subtle error.

**FastAPI for the API, Django for the interface.** Two frameworks, two test setups, two deployment concerns, one deadline. Rejected.

**Flask.** Lighter, but supplies little more than FastAPI does for this problem, and has a weaker permissions and admin story.

## Review trigger

Revisit if a second client (mobile, CLI, or a federated Turva instance) becomes a funded requirement, at which point an API layer in front of the same storage core is the likely answer rather than a framework change.
