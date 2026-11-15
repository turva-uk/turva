# ADR 0006: Named file teams intersected with live appointments

- **Status**: Implemented for organisational CSO collaboration
- **Date**: 2026-11-13
- **Related**: [Quill port decisions](../quill-port.md), [ADR 0004](0004-serialised-safety-file-saves.md), [ADR 0005](0005-controlled-pdf-exports.md)

## Context

Owner-only access cannot support several CSOs collaborating on a Federation's files without either sharing accounts or treating organisation administration as clinical authority. Neither is acceptable. Federation and practice files must stay separate, free-text organisation names are not proof of membership, and safety accountability must survive loss of the database index.

## Decision

- Provision organisations through an explicit operator command, not a self-service claim based on a name or email domain. Provisioning grants one verified account administration only. There is no organisation ancestry or inherited access.
- Administrators invite members and appoint CSOs. Invitations are single-use, expire after seven days, require the same verified email identity, are revocable, and grant membership only. Store token hashes, not bearer tokens; use URL fragments so tokens do not enter request paths or referrer headers. Retain a ten-minute per-address issuance-attempt cooldown, including failed mail delivery. Demoting an administrator revokes their outstanding invitations.
- Appointment requires the person's existing, verified account and explicit CSO profile declaration with professional-registration details. Appointment does not verify registration, training, competence or clinical judgement. Operational membership/role changes have an attributable append-only service history in PostgreSQL; it is not the safety evidence audit trail and is not protected against a database administrator.
- Assign a fresh opaque appointment identity on each appointment. Withdrawal of a profile declaration invalidates its appointment; a renewed declaration needs administrator reappointment. Removal and rejoining cannot revive old file grants.
- A version-2 file records exactly one accountable CSO and explicitly named CSO collaborators in `.turva/team.yaml`, with the organisation identity, each person's name/email/user/membership/appointment identities, and the reason. The Git commit records the acting person and time. This is safety governance evidence, not a live account directory.
- Version-1 owner-controlled files remain unchanged until explicit adoption. New files also start owner-controlled and use the same deliberate adoption flow. The legacy owner must be an appointed CSO in the chosen organisation and is the first accountable CSO. Adoption upgrades the manifest and writes the team in one commit; it never infers affiliation from document/profile text. Organisation transfers are not supported by this workflow.
- After adoption, the current accountable CSO or organisation administrators may change the team. Administrators can see a file-title inventory and its team administration record, but not its hazard/mitigation evidence unless separately appointed and explicitly named. Collaborators may edit evidence but cannot manage the team. Assigning a responsibility email is not a grant.
- Every private evidence read and write intersects the Git team with current active membership, current verified/active identity, and the exact appointment identity and matching profile declaration. Being an administrator, an unnamed CSO, the old owner or a Federation member is insufficient. Public files remain read-only for people without write authority. No superuser shortcut is added to evidence services.

## Writes, reads and recovery

Evidence/team saves lock the file's PostgreSQL row, the actual organisation's row, then the acting user's row, before taking the exclusive repository edit lock. Organisation role changes lock their organisation row too, serialising revocation against an authorised Git save. The user-row lock also prevents a profile withdrawal/account deactivation overtaking the permission check during an evidence save. Profile SQL updates naturally take the same lock. All final checks use current database state, not an opened form or cached model object. An in-flight authorised save may finish before a waiting revocation; no later save is authorised after revocation completes.

Team saves require both the full opened HEAD and the selected appointment identities from the opened choices. A stale form cannot silently bind a replacement appointment, even if the person has the same membership ID. Failed/stale forms retain their entries and preconditions; no automatic refresh-and-retry. Removing an accountable CSO appointment leaves that historical recorded name visible but gives it no authority. An administrator must explicitly name a current replacement.

The database organisation binding and managed marker only narrow listing candidates; they are rebuildable indexes. The small phase-one candidate set is checked against Git, not a second database team list that can retain an obsolete grant after a failed index update. Team/index writes use Git-before-index ordering. Recovery never manufactures users, membership or appointments from a repository: missing or mismatched operational identities fail closed, and `--owner` on reindex is only an operational custodian for a managed file. Reindex refuses to downgrade an already managed row to legacy owner access after an older version is restored. Back up operational database state as well as the irreplaceable evidence repositories.

Evidence responses recheck authority under their coherent repository snapshot. PDF downloads recheck after rendering, including cache hits, before opening the output stream. File and organisation JSON responses use `private, no-store`. Already delivered evidence cannot be retracted, and a response already streaming is not remotely erased by revocation.

## Limits and assurance

The controlled PDF explicitly includes the recorded team at its source version, labelled as historical rather than current professional verification. Narrative pages may still name earlier personnel: team changes never silently rewrite those clinical documents, and the export and interface warn that they need review. Document authoring is R10. Existing version-1 evidence remains readable and is not bulk-migrated. Unsupported or missing team records fail visibly or establish no private access; they never become an empty team with owner fallback.

These are single-deployment PostgreSQL/local-filesystem controls, not cross-server locking or protection against a privileged operator bypassing the application. Real PostgreSQL tests exercise role isolation, invitation replay/revocation, stale choices, recovery and lock ordering against real temporary Git repositories. A server-side lock-timeout experiment proves that appointment revocation and profile withdrawal cannot overtake an already authorised save. Real PDF rendering checks the historical team and escaping. Live fictional workflows exercise acceptance, colleague attribution, revocation, explicit renewal and retained drafts; rendered phone/tablet/desktop, keyboard and zoom states are inspected. Hazards TH-004/005/006/009 remain open.

Mitigation-scoped delegates and implementation/verification separation remain R13. Do not use a file-team grant as a substitute for that narrower workflow. Formal sign-off, public publishing, organisation transfer and professional competence verification are not delivered here.
