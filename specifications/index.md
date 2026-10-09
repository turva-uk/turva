# Turva Specifications

Documentation for Turva's clinical safety management platform.

## Start Here

- **[Phase One Scope](phase-one-scope.md)** - what the funded build delivers by Christmas, and what it defers. Read before the roadmap, which is far wider

## The Two Decisions Everything Else Assumes

- **[Architecture Principles](architecture-principles.md)** - design principles. The two that are not revisable are that **Git is the system of record** and that **the safety rules live in a library below the interface**
- **[ADR 0001](adr/0001-use-django-for-phase-one.md)** - Django, not FastAPI
- **[ADR 0002](adr/0002-monolith-over-api-first.md)** - a monolith, not an API-first platform

## Domain

- **[Core Specification](core-specification.md)** - domain model, the risk scales, and what Turva is and is not
- **[Safety File Layout](safety-file-layout.md)** - the on-disk contract for a Clinical Safety Management File, and the rules the storage layer enforces

## Direction

Neither of these is in phase one. They are here so that decisions taken now do not foreclose them.

- **[LLM Strategy](llm-strategy.md)** - how AI changes clinical safety work, and why structure and audit still matter
- **[Federation](federation.md)** - sharing and reusing safety cases between organisations. Its mechanism is Git, which is the main argument for the storage architecture

## Developer Reference

- **[Copilot Instructions](copilot-instructions.md)** - stack detail, conventions, and known traps. [AGENTS.md](../AGENTS.md) is the entry point for agents
- **[Roadmap](roadmap.md)** - implementation status. Much wider than the funded build
- **[Decision Records](adr/)** - decisions and the reasoning that produced them

## Archive

Kept for provenance. None of it describes the current system.

See **[archive/index.md](archive/index.md)** for what is in there and why. In short: the original specification, the pre-rationalisation architecture docs including the `vmpt.md` that first described the Git architecture, and the December 2025 rewrite that dropped it.

## Writing in Here

A specification says what the system does and why. A decision that is expensive to reverse, or that contradicts something already written, goes in an [ADR](adr/) instead - and reversing a recorded principle means writing the reversal down, not deleting the old text. That is the lesson of the archive above.
