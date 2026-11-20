# ADR 0008: Kubernetes and Helm deployment

- **Status**: Accepted; the Helm chart and the MBPCC deployment are follow-up work
- **Date**: 2026-11-20
- **Decision-maker**: gdvallance, from the constraints and starting positions recorded in issues #140, #141 and #142
- **Supersedes**: the exclusion of Kubernetes from phase one in [phase-one-scope.md](../phase-one-scope.md) and the deployment sections of [architecture-principles.md](../architecture-principles.md); not [ADR 0004](0004-serialised-safety-file-saves.md), whose locking decision this ADR preserves
- **Related**: [ADR 0004](0004-serialised-safety-file-saves.md), [ADR 0005](0005-controlled-pdf-exports.md), [#141](https://github.com/turva-uk/turva/issues/141), [#142](https://github.com/turva-uk/turva/issues/142)

## Context

The MBPCC deployment is moving Turva onto Kubernetes, and Helm is how that deployment will be packaged and repeated. The specifications currently rule this out: the out-of-scope list in [phase-one-scope.md](../phase-one-scope.md) names Kubernetes, and the deployment principles describe a single VPS running Docker Compose as "the funded deployment". Those documents bind agents and reviewers, so the decision must be recorded before any chart exists, or the chart will be built against a specification that forbids it.

Containers are the easy part. The hard part is that the safety file repositories on disk are the system of record, and saves are serialised by the POSIX advisory lock described in [ADR 0004](0004-serialised-safety-file-saves.md) - a local-filesystem lock, "not NFS/distributed coordination". Any arrangement that puts two writers on two hosts against one repository breaks that guarantee silently: `flock` on network filesystems does not fail loudly, it stops meaning anything, and the result is the interleaved writes and misattributed commits ADR 0004 exists to prevent (TH-004). #141 records the ways Kubernetes breaks the assumption by default: multiple replicas on RWX storage, rolling updates that overlap old and new pods, pod termination mid-save leaving a dirty tree, and Jobs that touch repositories without the lock.

The container runs as uid 1000, not root, and that must survive into the pod.

## The MBPCC constraints, still to be confirmed

The specifics of the MBPCC cluster were not known when this ADR was written, and they shape several answers below. They are open items to confirm before the chart is finalised:

- The cluster platform and who operates it
- The storage classes on offer
- Networking and ingress rules: which ingress controllers are permitted, and who terminates TLS
- Data residency requirements, and the off-cluster backup locations that satisfy them
- Availability expectations, and the recovery point and recovery time targets from #142

## Decision

1. **Scope.** Kubernetes and the Helm chart are inside phase one: the MBPCC deployment is part of the funded delivery. High availability is not. The out-of-scope list loses Kubernetes and keeps high availability, because the deployment gains orchestration, not redundancy.
2. **One writer.** The `web` Deployment runs a single replica, on a ReadWriteOnce PersistentVolume mounted at `SAFETY_FILE_ROOT`, with `strategy.type: Recreate` so an old and a new pod never hold the volume at once. This keeps the ADR 0004 lock guarantee unchanged: one pod on one node against one local volume is the same lock scope as gunicorn's workers on one VPS. Running multiple replicas would need a lock proven to work across hosts - a database advisory lock per safety file, or a single dedicated writer process - and is deferred to its own ADR, with the ADR 0004 concurrency tests re-run across pods before any such change is accepted.
3. **Storage.** The repositories live on RWO block storage, in a StorageClass chosen from what the MBPCC cluster actually offers. Shared RWX storage (NFS/EFS and similar) is ruled out: the current locks do not cover it, and #141's deployment-position ADR would have to be written before it could be reconsidered.
4. **Backup and restore.** Follows #142: per repository, take the shared `snapshot()` lock and `git bundle create --all`, from a Job running on the same node and filesystem as `web` so the lock means something. Copies must leave the cluster; a CSI VolumeSnapshot lives on the same storage system and account, so it is not a backup on its own, and one taken mid-save is not a consistent copy. The database is backed up on its own schedule. The restore order is fixed and documented: restore the repositories, restore the database, run `reindex_safety_files`. A restore is tested into a fresh namespace before production (TH-003).
5. **PostgreSQL.** A community Helm chart, operated by us, with scheduled off-cluster backups and a documented restore. The database is an index and operational state, not evidence, but its identities and access are not rebuildable and must be recoverable (TH-003).
6. **Edge and TLS.** The Helm path replaces Caddy with the cluster's Ingress controller plus cert-manager. The application keeps owning its routing, as it does behind Caddy today; the Ingress passes the whole URL space through, exactly as the `Caddyfile` does. Caddy remains in the Docker Compose path.
7. **Migrations.** Django migrations run as a Helm pre-upgrade hook Job. Migrations stay backward-compatible where practical, so a rolled-back release does not strand the database - the same rule the single VPS already follows, unchanged by orchestration.
8. **The container identity.** The pod `securityContext` carries `runAsUser: 1000` and `fsGroup: 1000`, so the application user can write to the volume without root. The image already runs as uid 1000; do not revert that, in either deployment path.
9. **One chart, many deployments.** Per-deployment differences - storage class, ingress host and TLS, database resources, backup schedule and destination, residency and retention - live in `values-<env>.yaml` files, never in chart templates. The single-VPS Docker Compose path stays supported alongside the chart: it remains the development path and the right answer for a deployment small enough not to want a cluster.

## Relationship to ADR 0004

ADR 0004 is not rewritten, and nothing in this decision weakens it: the guarantee survives because exactly one pod writes, on one RWO volume, with `Recreate` preventing overlapping writers. But orchestrated deployment makes one of ADR 0004's recorded limits more frequent rather than theoretical: a pod killed mid-save (eviction, drain, deploy) leaves a dirty tree that blocks further saves until someone inspects it. That is the designed behaviour, and #141 is the delivery issue for the controls around it - graceful shutdown ordered so in-flight saves can finish (`--graceful-timeout` below `terminationGracePeriodSeconds`), a PodDisruptionBudget and a node-drain runbook, a dirty-tree runbook, and a concurrency check on the target cluster's storage before production. Any Job that touches the repositories - backup, seeding, a reindex run - must hold the same lock and run on the same filesystem (#142). The `safety_file/locking.py` docstrings that describe the funded deployment as a Linux VPS are updated with that implementation work, not from this document.

## Consequences and limits

- Deploying `web` is a brief outage, in both paths. That is already accepted for a tool used by CSOs during office hours; `Recreate` keeps it true under Kubernetes instead of trading it for a rolling update that would briefly run two writers.
- Writes do not scale horizontally, and neither do reads, since any pod reading the repositories must see the same volume and the same clean-tree rules. Scaling either is a separate decision, not a values change.
- The Helm chart does not exist yet. Writing it is out of scope for #140 and follows in its own issue once this ADR is accepted; #141 and #142 are the storage, rollout and backup delivery issues.
- [SAFETY.md](../../SAFETY.md) records the new causes this gives TH-003 and TH-004 and keeps both hazards open; no control is delivered by this ADR.
- Docker Compose, the development environment and the single-VPS deployment are unchanged by this decision.

## Review triggers

Revisit when the MBPCC cluster specifics are confirmed; before the chart is implemented; before proposing multiple replicas, RWX storage, a managed database, or any lock that claims to work across hosts; and before deploying anywhere beyond MBPCC.
