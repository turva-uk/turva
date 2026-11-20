# ADR 0008: Kubernetes and Helm deployment

- **Status**: Accepted; the Helm chart and the MBPCC deployment are follow-up work
- **Date**: 2026-11-20
- **Decision-maker**: gdvallance, from the constraints and starting positions recorded in issues #140, #141 and #142
- **Supersedes**: the exclusion of Kubernetes from phase one in [phase-one-scope.md](../phase-one-scope.md) and the deployment sections of [architecture-principles.md](../architecture-principles.md); not [ADR 0004](0004-serialised-safety-file-saves.md), whose locking decision this ADR preserves
- **Related**: [ADR 0004](0004-serialised-safety-file-saves.md), [ADR 0005](0005-controlled-pdf-exports.md), [#141](https://github.com/turva-uk/turva/issues/141), [#142](https://github.com/turva-uk/turva/issues/142)

## Context

The MBPCC deployment is moving Turva onto Kubernetes, and Helm is how that deployment will be packaged and repeated. The specifications currently rule this out: the out-of-scope list in [phase-one-scope.md](../phase-one-scope.md) names Kubernetes, and the deployment principles describe a single VPS running Docker Compose as "the funded deployment". Those documents bind agents and reviewers, so the decision must be recorded before any chart exists, or the chart will be built against a specification that forbids it.

The safety-file Git repositories are the system of record. [ADR 0004](0004-serialised-safety-file-saves.md) serialises saves with `flock` on a local Linux filesystem. Network filesystem locking depends on the implementation and mount options and is outside that contract. An overlap between writers that do not share the same effective lock can interleave writes and misattribute commits (TH-004).

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
2. **One writer.** Target one `web` replica on block storage mounted at `SAFETY_FILE_ROOT`, with `strategy.type: Recreate` for upgrades. [ReadWriteOnce](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes) is single-node, not single-pod, and [Recreate](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#recreate-deployment) does not prevent overlap on every pod replacement. Neither is writer fencing. Before deployment, #141 must demonstrate on the selected storage that every concurrent repository accessor shares the same effective lock, and that a previous node cannot still write after recovery transfers access. Do not force replacement or reattachment while the old writer might still have access. Use ReadWriteOncePod where the CSI driver supports it and the backup design accommodates exclusive mounting; otherwise demonstrate equivalent safety for the chosen topology. Multiple application replicas or cross-host locking require a separate ADR and concurrency evidence.
3. **Storage.** Choose a block-backed StorageClass that meets the writer and locking requirements above. Shared ReadWriteMany storage is out of scope; reconsidering it requires a separate ADR.
4. **Backup and restore.** Under the shared `snapshot()` lock, make and verify a full Git bundle per repository, then copy it to encrypted off-cluster storage. The backup process must share the same filesystem and lock domain as `web`, or run with `web` stopped and the prior writer excluded. A CSI snapshot alone is not an off-cluster backup or proof of application consistency. Back up PostgreSQL separately. #142 must document how to choose a compatible recovery point for Git and PostgreSQL; rebuilding the index cannot reconcile historical team grants with newer or older operational authority. Restore Git, restore PostgreSQL, rebuild the index, then verify history, attribution and live access (including denials) in isolation before serving traffic. Report incomplete backups or mismatched authority rather than silently accepting them (TH-003/TH-004/TH-005).
5. **PostgreSQL.** A community Helm chart, operated by us, with scheduled off-cluster backups and a documented restore. The database is an index and operational state, not evidence, but its identities and access are not rebuildable and must be recoverable (TH-003).
6. **Edge and TLS.** Use the cluster's supported ingress and certificate management (cert-manager where permitted). The chart must serve the built React app and route API, administration and interim Django paths correctly. Verify HTTPS, trusted proxy headers and session/CSRF behaviour on the target ingress. Keep Caddy for Docker Compose.
7. **Migrations.** Run a blocking migration Job before serving the new release. A [Helm `pre-upgrade` hook](https://helm.sh/docs/topics/charts_hooks/) runs while the old application can still serve traffic, so use it only for migrations compatible with that version, or quiesce the old application first. On initial install, wait for PostgreSQL and its credentials before running migrations; do not expose application traffic until they succeed. Helm rollback does not roll back the database. Test initial install, upgrades and rollback or recovery before production.
8. **The container identity.** Run as non-root with `runAsUser`, `runAsGroup` and `fsGroup` set to 1000. Verify the selected driver and volume permissions before use; do not fall back to root.
9. **One chart, many deployments.** Per-deployment differences - storage class, ingress host and TLS, database resources, backup schedule and destination, residency and retention - live in `values-<env>.yaml` files, never in chart templates. The single-VPS Docker Compose path stays supported alongside the chart: it remains the development path and the right answer for a deployment small enough not to want a cluster.

## Relationship to ADR 0004

ADR 0004 remains the governing contract, not a guarantee already proved on Kubernetes. #141 must verify locking under concurrent saves, planned rollout and interrupted replacement on the target storage. Configure graceful shutdown to let in-flight saves finish where possible, with Gunicorn's graceful timeout below the pod termination grace period. A forced interruption can leave a dirty tree: preserve it for inspection, block evidence reads and saves as ADR 0004 requires, and never reset it automatically. Document how the single-replica disruption policy interacts with node drains: it can block voluntary eviction, but it does not protect against node failure. All repository Jobs must use the same locking rules. The chart and runbooks are follow-up work.

## Consequences and limits

- Deploying `web` takes it offline in both paths. Recovery may take longer if storage must move or an interrupted save requires inspection. Confirm the outage and recovery targets with MBPCC before production.
- Writes do not scale horizontally, and neither do reads, since any pod reading the repositories must see the same volume and the same clean-tree rules. Scaling either is a separate decision, not a values change.
- The Helm chart does not exist yet. Writing it is out of scope for #140 and follows in its own issue once this ADR is accepted; #141 and #142 are the storage, rollout and backup delivery issues.
- [SAFETY.md](../../SAFETY.md) records the storage, attribution and restored-access risks. No control is delivered by this ADR.
- Docker Compose, the development environment and the single-VPS deployment are unchanged by this decision.

## Review triggers

Revisit when the MBPCC cluster specifics are confirmed; before the chart is implemented; before proposing multiple replicas, RWX storage, a managed database, or any lock that claims to work across hosts; and before deploying anywhere beyond MBPCC.
