# ADR 0004: Serialised safety-file saves with opened-version preconditions

- **Status**: Implemented for phase-one hazard entry
- **Date**: 2026-11-11
- **Related**: [ADR 0003](0003-react-frontend-over-drf.md), [safety-file layout](../safety-file-layout.md)

## Context

The hazard log is a committed generated page. Every hazard or mitigation save can change it, even when the individual artefacts differ. Concurrent requests can otherwise interleave identifier allocation, file writes, log generation and Git staging, producing lost updates or a commit attributed to the wrong person. Serialising only `git commit` is too late. A lock alone also cannot recognise an old form saved after another request has completed.

## Decision

Keep the committed generated-log contract. On the local Linux filesystem used by the funded deployment, `SafetyFileRepository.edit()` holds an exclusive advisory lock at `.git/turva.lock` for the entire operation. Its nested saves on the same repository instance retain that lock. Hazard and mitigation saves revalidate mutable domain objects before writing. New safety-file creation atomically reserves its directory before scaffolding.

The hazard-write service requires the full HEAD read when the form opened. It checks that precondition inside the lock, before allocating identifiers or writing. Any intervening commit in that safety file returns a conflict, even if it concerns a different hazard. The interface retains the stale draft and offers comparison in another tab; it never substitutes the new HEAD and retries automatically. Clinical judgements are not automatically merged.

Multi-read HTTP responses use a shared `snapshot()` lock and require a clean working tree, so the returned evidence and HEAD belong together. A dirty/staged tree blocks both these reads and new saves. Failed work is left for administrator inspection, not automatically reset or attributed to the next saver. Lock acquisition has a five-second bound and reports contention as retryable unavailability.

## Consequences and limits

- Each successful changed form save updates the artefact and generated log in one attributable commit. Unchanged saves do not add a commit. IDs, creation dates and existing mitigation links are not client-controlled.
- The whole safety file is the concurrency unit. A small CSO team may need to reopen a form after an unrelated hazard save; this is safer and more reversible than an implicit merge.
- A request may commit successfully and lose its response. The UI reports uncertainty, preserves the draft, and the original version precondition prevents a duplicate create or silent overwrite on retry.
- These are cooperating-process advisory locks, not NFS/distributed coordination or protection against administrators using Git/files directly. Low-level readers used for inspection remain available without a snapshot; callers presenting committed evidence must use one.
- There is no rollback transaction across the filesystem and Git. An interrupted/failed write can leave a dirty tree. Recovery requires inspection; no evidence is silently discarded. Read-only repositories also need write permission to the lock file.
- No on-disk safety-file schema changes. The lock is inside `.git`, not safety content.

## Evidence and review triggers

Storage tests cover parallel allocation/log regeneration, competing stale saves, shared readers, excluded writers across processes, nested locks, rejected read-to-write upgrades, mutable-object validation, staged/dirty refusal and preserved failed commits. API tests exercise real Git writes, ownership, CSRF, immutable fields, stale creates/edits and all 25 risk-preview cells. The demo walkthrough includes a two-tab conflict exercise.

Revisit before adding shared/network storage, multiple hosts, collaborative merges, or a requirement for per-artefact concurrency. Do not drop the committed generated log as an incidental implementation change: that would revise the on-disk contract and needs a separate decision.
