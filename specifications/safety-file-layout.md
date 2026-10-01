# Safety File Layout

The on-disk structure of a Clinical Safety Management File. Each one is a Git repository holding a Zensical documentation site, as established in [architecture-principles.md](architecture-principles.md#git-is-the-system-of-record).

This document is the contract between the storage layer, the document pipeline, and the web interface. Changing it is a schema migration, not a refactor.

## Layout

```text
<repository root>/
├── .turva/
│   └── manifest.yaml              # Schema version, identity, template provenance
├── mkdocs.yml                     # Zensical site configuration
└── docs/
    ├── index.md                   # Front page: system, scope, status
    ├── clinical-risk-management-plan.md
    ├── clinical-safety-case-report.md
    ├── hazards/
    │   ├── index.md               # Hazard log. Generated - do not hand-edit
    │   └── HAZ-001-<slug>.md      # One file per hazard
    ├── mitigations/
    │   └── MIT-001-<slug>.md      # One file per mitigation
    └── assets/                    # Images, attached evidence
```

### Why one file per hazard

Hazards are edited independently by different people, and a per-hazard file means a commit touches only the hazard it concerns. That keeps `git log -- docs/hazards/HAZ-003-*.md` a precise history of one safety decision, which is the audit property the whole design exists to provide. A single `hazard-log.md` would make every edit collide and every history useless.

`docs/hazards/index.md` is generated from the individual hazard files. It is committed, because the Zensical site needs it and because a reader cloning the repository should see the log without running a build step. It carries a generated-file banner.

## Identifiers

`HAZ-001`, `MIT-001`. Zero-padded to three digits, allocated sequentially per safety file, never reused.

Identifiers are permanent. A hazard is never deleted, only closed with justification - a rule from [core-specification.md](core-specification.md) that the file layout has to support, so the filename slug may change but the identifier may not. The identifier in the frontmatter is authoritative; the filename is for human navigation.

## Hazard frontmatter

```yaml
---
id: HAZ-001
title: Patient's severe hypertension reading is not escalated
status: open # open | closed | transferred
owner: dr.patel@riverbank.example.nhs.uk
created: 2026-02-11
updated: 2026-03-04
cause: >
  Readings are reviewed in a weekly batch, so a reading above the escalation
  threshold can wait up to seven days before a clinician sees it.
effect: >
  Delay to treatment of severe hypertension, which the pathway requires to be
  acted on within 24 hours.
harm: >
  Avoidable stroke, myocardial infarction, or hypertensive emergency.
initial:
  severity: 4
  likelihood: 3
residual:
  severity: 4
  likelihood: 1
mitigations:
  - MIT-001
  - MIT-002
justification: >
  Residual likelihood is reduced to Very Low by automated same-day flagging and
  a daily safety-netting report. Severity is unchanged because the potential
  harm is unaltered; only its probability is reduced.
---
```

### Risk level is absent, deliberately

The frontmatter records `severity` and `likelihood`. It does **not** record risk level, because risk level is derived - see [core-specification.md](core-specification.md) and the "Derived, Not Entered" principle. It is calculated when the hazard is read or rendered.

Storing it would create two sources of truth that can disagree, and a stale stored value is exactly the subjective downgrading the rule exists to prevent. The earlier `example_template/` prototype stored free-text levels such as "High" and "Medium" alongside a separately entered risk score, which permitted precisely that; this layout does not.

`severity` and `likelihood` are integers 1-5 on the scales in `core-specification.md`. Any other value is invalid and must be rejected rather than coerced.

## Mitigation frontmatter

```yaml
---
id: MIT-001
title: Automated same-day flagging of readings above threshold
status: implemented # proposed | implemented | verified | withdrawn
owner: j.okafor@riverbank.example.nhs.uk
created: 2026-02-18
updated: 2026-03-01
control_type: technical # elimination | technical | warning | procedural
hazards:
  - HAZ-001
evidence: >
  Threshold logic covered by automated tests; see supplier release 4.2 notes in
  docs/assets/. Verified in the 2026-03 pilot against 412 readings.
---
```

`control_type` follows the hierarchy of controls in `core-specification.md`, strongest first. It is recorded because a safety case that relies entirely on `procedural` controls is weaker than one that eliminates hazards by design, and that should be visible rather than buried in prose.

The hazard-to-mitigation relationship is recorded on both sides. That is deliberate redundancy: either file read alone is complete, which matters when a reviewer is reading a single hazard in a Git diff. The storage layer keeps the two in step and treats disagreement as a validation error.

## `.turva/manifest.yaml`

```yaml
schema_version: 1
project_id: 0b9f4e2a-5c7d-4c1e-9a3f-2d8e6b1a4c70
name: BP@Home remote blood pressure monitoring
standard: DCB0160 # DCB0129 | DCB0160
template: dcb0160-deployment
template_version: 1
created: 2026-02-10
```

`schema_version` exists so that a safety file created today can be recognised and upgraded by a later version of Turva. The database index is rebuildable from these manifests, which is what makes the database disposable.

`project_id` is the join key to the database index. It lives in the repository so that the repository remains the source of truth: a restored or relocated repository still knows what it is.

## Placeholders

Project-level values for template rendering live in `.turva/values.yaml` where a template needs them. Rendering happens at project creation; the result is committed as ordinary Markdown.

Turva does **not** keep templates live and re-render on read. A safety case is a historical record, and a document whose text changes because a template changed is not evidence. Templates scaffold, then step out of the way.

## Document generation

The PDF is produced by building the Zensical site from the repository and running WeasyPrint over the built HTML, the approach used by <https://growth.rcpch.ac.uk>.

Generated artefacts are not committed. They are reproducible from the commit they were built from, and are cached against that commit SHA. A PDF that cannot be traced to a commit is not evidence - see TH-007 in [SAFETY.md](../SAFETY.md).

## Validation rules

The storage layer enforces these on read and on write, and refuses to write an invalid file:

1. `severity` and `likelihood` are integers 1-5, in both `initial` and `residual`
2. `id` matches `HAZ-\d{3}` or `MIT-\d{3}` and is unique within the safety file
3. `id` in frontmatter matches the identifier in the filename
4. `status` is one of the permitted values
5. Every mitigation referenced by a hazard exists, and vice versa, with the relationship recorded on both sides
6. `residual` severity and likelihood are each no greater than `initial` - a mitigation that increases risk is a modelling error, and if risk genuinely rose, that is a new assessment, not an edit
7. A hazard with `status: closed` has a non-empty `justification`
8. `schema_version` in the manifest is one this version of Turva understands

Rule 6 is the one most likely to be argued with. It is deliberate: it catches transposed values, which is a realistic data-entry error with a safety consequence.
