# ADR 0003: A React frontend over a Django REST Framework API

- **Status**: Accepted
- **Date**: 2026-11-10
- **Decision-maker**: Marcus Baw, with the Turva team
- **Supersedes**: [ADR 0002](0002-monolith-over-api-first.md)
- **Related**: [ADR 0001](0001-use-django-for-phase-one.md)

## Context

[ADR 0002](0002-monolith-over-api-first.md) withdrew API-first design and made phase one a server-rendered monolith. The React single-page application was removed in `e069d4c` on 2026-10-01, and every screen built since - authentication, the CSO profile, safety file creation, listing and detail - is a Django template.

The team has decided to keep React and Mantine after all. The backend stays Django, with Django REST Framework serving the application.

ADR 0002 named its own review trigger:

> Revisit when a second client or an external integration becomes a funded requirement: a mobile application, a CLI, a federated Turva instance exchanging data over anything other than Git, or an NHS organisation contracting for machine-readable export.

A React SPA is that second client. This ADR is the trigger firing, not a violation of the previous decision - but it reverses the conclusion, so it is recorded rather than quietly applied.

## Decision

The interface is a React single-page application using Mantine, served separately from a Django application that exposes a JSON API through Django REST Framework.

- **Authentication is session-based**, unchanged. `django.contrib.sessions` with the database backend, and DRF's `SessionAuthentication`. Not JWT - see Rationale.
- **The API is versioned from its first release.** ADR 0002 was right that a half-specified API is worse than none.
- **The storage layer stays framework-free.** `safety_file/` imports no web framework and remains the only code that reads or writes a safety file.

## The constraint that matters most

ADR 0002 said this about the possibility now being exercised:

> If a second client is ever funded, an HTTP layer goes over the same core - and because the core holds the rules, that layer cannot weaken them.

That was offered as reassurance. It is now a design instruction, and the most important sentence in this document.

**DRF viewsets and serializers call the existing service functions. They do not reimplement what those functions do.** Concretely, `app/safetyfiles/services.py` owns:

- the ordering that writes the repository _before_ the index row, because the repository is the system of record
- the rule that a failed index write does **not** delete the repository
- slug allocation that checks the filesystem as well as the database, because an orphan directory is what a failed creation leaves behind
- template value population, including the unverified-registration caveat

A `ModelSerializer` with `Meta.model = SafetyFile` and a default `create()` would bypass every one of those and produce an index row for a repository that was never written. That is not a style preference; it is the difference between a safety file existing and a database row claiming one does.

The same applies to `User.declare_cso()`, which stamps and clears the declaration date, and to the storage layer's own validation.

## Rationale

**The team can contribute to React.** The reboot was about restarting a project that stalled for want of people with time. A stack the team already knows is worth more than a marginally simpler one they do not, and that consideration is not an engineering judgement to overrule.

**Session auth rather than JWT.** The removed frontend already sent `credentials: "include"` on every request, so it was built for cookies. Sessions are revocable server-side, which matters for a tool holding an organisation's clinical risk assessment; a JWT is valid until it expires whatever happens to the account. This also keeps the existing authentication, email verification and password reset work intact.

**What is being accepted, plainly.** The commit that removed React gave the reason as avoiding "building every screen twice, once for the frontend and once again for the backend". That cost returns. Phase one has six capabilities and its schedule risk is already concentrated in capability 4, which has no natural stopping point. The mitigation is sequencing: build the API over services that already exist and are tested, keep the Django templates working until React reaches parity, and do not let the two diverge in behaviour.

## Consequences

**Added:**

- `djangorestframework` as a dependency. 3.18.3 supports Django 6.1 and Python 3.14, which the current pins are.
- CORS handling for the development split-origin setup.
- **CSRF on the client.** DRF's `SessionAuthentication` enforces CSRF on unsafe methods. The removed frontend had _no_ CSRF handling at all, because FastAPI did not require it. Every mutating request needs the `X-CSRFToken` header. This is small but mandatory, and it will not fail until the first POST.
- A frontend build, test and lint pipeline in CI.

**Replaced:**

- Django forms become DRF serializers; template views become viewsets; `verified_required` becomes a permission class.
- The 17 templates and the hand-written stylesheet give way to Mantine components.
- The HTTP-layer tests - roughly a thousand lines across `test_views.py` and parts of `test_profile.py` - are rewritten against the API.

**Unchanged:**

- `safety_file/` and its 110 tests. It survived FastAPI to Django and survives this.
- The models, services, management commands, and the tests that exercise them.
- Git as the system of record, and the database as a rebuildable index over the repositories.
- Session-based authentication. **Not JWT**, which remains an invariant in AGENTS.md.

## Alternatives considered

**Stay with HTMX.** Rejected by the team. The engineering case for it was real - one codebase, no second representation of every object - but it does not outweigh a team that can contribute to React and cannot readily contribute to Django templates.

**Django templates for the safety-critical screens, React elsewhere.** Rejected. Two interface technologies means two places a safety rule can be presented differently, and a reader of a hazard log should not have to know which stack rendered it.

**JWT instead of sessions.** Rejected, as above: a session can be revoked server-side, and the existing authentication work stays intact.

## Review trigger

Revisit if the split starts producing behaviour that differs between the API and the interface in ways tests do not catch, or if building each screen twice is measurably displacing capability 4 - the guided process - which is the part of phase one the customer actually asked for.
