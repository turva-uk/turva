# Architecture Decision Records

Durable decisions, with the reasoning that produced them, recorded so that the next person - or the next agent - does not have to reconstruct it or quietly reverse it.

One file per decision, numbered, never rewritten once accepted. A decision that turns out to be wrong gets a new ADR that supersedes the old one, and the old one stays.

- [0001: Use Django for the phase-one build](0001-use-django-for-phase-one.md) - Accepted, 2026-10-02

## When to write one

Write an ADR when a choice is expensive to reverse, when it contradicts something already written down, or when the reasoning will not be obvious from the code six months later. Framework choices, storage architecture, and anything touching the audit trail qualify. Library choices usually do not.
