# Architecture Decision Records

Durable decisions, with the reasoning that produced them, recorded so that the next person - or the next agent - does not have to reconstruct it or quietly reverse it.

One file per decision, numbered, never rewritten once accepted. A decision that turns out to be wrong gets a new ADR that supersedes the old one, and the old one stays.

- [0001: Use Django for the phase-one build](0001-use-django-for-phase-one.md) - Accepted, 2026-10-02
- [0002: A monolith, not an API-first platform](0002-monolith-over-api-first.md) - Superseded by 0003, 2026-11-10
- [0003: A React frontend over a Django REST Framework API](0003-react-frontend-over-drf.md) - Accepted, 2026-11-10
- [0004: Serialised safety-file saves with opened-version preconditions](0004-serialised-safety-file-saves.md) - Implemented for hazard entry, 2026-11-11
- [0005: Controlled PDF exports from committed evidence](0005-controlled-pdf-exports.md) - Implemented as a draft text export, 2026-11-11

0002 and 0003 are a matched pair, and reading them together is more use than reading either alone: 0002 withdrew the API and named the condition under which it should come back, and 0003 is that condition being met. The constraint 0002 offered as reassurance - that an HTTP layer over the core cannot weaken the safety rules, because the core holds them - is the main design instruction in 0003.

## When to write one

Write an ADR when a choice is expensive to reverse, when it contradicts something already written down, or when the reasoning will not be obvious from the code six months later. Framework choices, storage architecture, and anything touching the audit trail qualify. Library choices usually do not.
