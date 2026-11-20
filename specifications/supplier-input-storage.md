# Supplier Input and Provenance Storage (Proposal)

<!-- cspell:ignore openxmlformats officedocument wordprocessingml OOXML nosniff -->

> **Status: Proposed - awaiting human acceptance.** Nothing here is implemented or accepted. It changes no runtime code, schema, migration, upload route or clinical decision. Until a maintainer accepts it, [safety-file-layout.md](safety-file-layout.md) remains the contract and unrecognised provenance fields continue to be refused. Accepting it is a prerequisite for supplier upload and extraction work ([#57](https://github.com/turva-uk/turva/issues/57), [#58](https://github.com/turva-uk/turva/issues/58)); it is not that work.

This proposal defines how a supplier's DCB0129 safety case, the hazard candidates read from it, the content that could not be read, and the CSO's review decisions would be stored in a safety file's Git repository. It applies the existing invariants rather than adding new ones: Git is the system of record, risk is derived, writes are attributable and append-only, saves use the opened version, and the storage layer imports no web framework.

The governing hazard is TH-010 in [SAFETY.md](../SAFETY.md): an extraction that silently drops or garbles a supplier hazard produces a deployment safety case that looks complete and is not. Every rule below exists so that a reviewer can trace each local hazard back to a byte-identical supplier original, and can see what was never turned into a hazard and why.

## Principles

1. **The original is evidence, and is immutable.** The uploaded bytes are committed unchanged, identified by SHA-256, and never modified, replaced or deleted by Turva.
2. **An extraction is a proposal, not a reading.** Candidates are recorded with their exact source location and verbatim cells, and stay candidates until a CSO decides.
3. **Nothing is silently passed over.** Content that could not be read is recorded as unreadable, counted, and must be acknowledged by a decision before the source can be reported as reviewed.
4. **Supplier assessment and local assessment are different records.** The supplier's stated severity and likelihood stay in the extraction record. Local `initial` and `residual` scores are entered by the CSO on the hazard and are never copied from the supplier.
5. **Decisions are attributable.** Upload, extraction and each review decision are separate commits attributed to the acting user. Dates and actors come from Git, not client-supplied metadata.

## Proposed layout

Sources live in a top-level `sources/` directory, **outside** `docs/`, so the Zensical site never publishes a supplier's document and the controlled PDF export cannot pick it up by accident ([ADR 0005](adr/0005-controlled-pdf-exports.md)).

```text
<repository root>/
├── .turva/manifest.yaml           # Declares the supplier-sources capability (see Schema version)
├── sources/
│   └── SRC-001/
│       ├── source.yaml            # Identity, checksum, supplier-stated metadata, status
│       ├── original.docx          # The uploaded bytes, unchanged. Or original.pdf
│       ├── extractions/
│       │   └── EXT-001.yaml       # One extraction run: candidates and unreadable items
│       └── reviews/
│           └── EXT-001.yaml       # Append-only CSO decisions about EXT-001
└── docs/
    └── hazards/
        └── HAZ-004-<slug>.md      # A promoted hazard carries a `source` reference
```

### Identifiers

- `SRC-001`: one per uploaded original, sequential per safety file, zero-padded to three digits, never reused. A new supplier version is a new `SRC`.
- `EXT-001`: one per extraction run, sequential within its source, never reused. Re-running extraction with a different column map or extractor version creates a new run; the old one is retained.
- `C-001` (candidate) and `U-001` (unreadable item): sequential within one extraction run.
- A fully qualified reference is `SRC-001/EXT-001/C-003`. It is the only form used outside the source directory.

The original's filename is fixed (`original.docx` or `original.pdf`); the uploaded filename is retained as information only, so a hostile or unwieldy name never becomes a path.

## `source.yaml`

```yaml
id: SRC-001
kind: supplier-dcb0129 # the only kind in phase one
status: active # active | superseded | withdrawn
title: ExampleRecord clinical safety case report
supplier: Example Supplier Ltd (fictional)
supplier_reference: EXR-CSCR-0042 # as stated by the document; not verified
supplier_version: "3.1" # as stated by the document; not verified
supplier_date: 2026-05-01 # as stated by the document; not verified
original:
  path: original.docx
  media_type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
  size_bytes: 48213
  sha256: 9f2c0e1d7b4a6c8e5f3a2b1d0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e
  supplied_filename: "EXR CSCR v3.1 FINAL.docx"
supersedes: null # or SRC-00N for the earlier supplier version
reason: >
  Supplier's DCB0129 for the release being deployed, received from the
  supplier's clinical safety officer by email.
```

- `sha256`, `size_bytes` and `media_type` are computed by Turva from the bytes, never accepted from the client. Readers recompute the checksum and refuse a source whose original no longer matches.
- `supplier_*` fields are what the document says about itself and are displayed as **not verified by Turva**, mirroring TH-009's handling of registrations.
- `status` changes (`superseded`, `withdrawn`) are new commits with a non-empty `withdrawn_reason` or a `superseded_by` reference. The original stays in the repository and in history. Hazards promoted from a withdrawn or superseded source keep their reference and are flagged for review; nothing is unlinked automatically.

## Extraction record

```yaml
id: EXT-001
source: SRC-001
source_sha256: 9f2c0e1d7b4a6c8e5f3a2b1d0c9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e
extractor:
  name: turva-docx-table
  version: 1
table:
  locator: { table: 4, heading: "Hazard log" } # PDF: { page: 12, table: 1 }
  headers:
    [Ref, Hazard, Cause, Effect, Harm, Controls, Severity, Likelihood, Risk]
column_map: # column index, from 0, feeding each field; null for none
  supplier_id: 0
  title: 1
  cause: 2
  effect: 3
  harm: 4
  controls: 5
  severity: 6
  likelihood: 7
counts: { rows_seen: 3, candidates: 2, unreadable: 1 }
candidates:
  - id: C-001
    location: { table: 4, row: 1 }
    cells:
      [
        H-01,
        Wrong patient record displayed,
        "...",
        "...",
        "...",
        "...",
        "4",
        "2",
        High,
      ]
    supplier_id: H-01
    title: Wrong patient record displayed
    cause: "..."
    effect: "..."
    harm: "..."
    controls: "..."
    supplier_assessment: { severity: 4, likelihood: 2 }
    problems: []
  - id: C-002
    location: { table: 4, row: 2 }
    cells:
      [
        H-02,
        Reminder not sent,
        "...",
        "...",
        "...",
        "...",
        Moderate,
        "3",
        Medium,
      ]
    supplier_id: H-02
    title: Reminder not sent
    cause: "..."
    effect: "..."
    harm: "..."
    controls: "..."
    supplier_assessment: { severity: null, likelihood: 3 }
    problems: [severity_not_integer]
unreadable:
  - id: U-001
    location: { table: 4, row: 3 }
    reason: merged_cells # merged_cells | image_only | no_text_layer | unsupported_construct | outside_table
    excerpt: "H-03 / H-04 (see appendix)"
```

- `cells` are the verbatim extracted text of the row, in column order. Mapped fields are copies of cells, never rewritten or summarised. A column the map does not use (here the supplier's own `Risk`) survives only in `cells`: Turva does not store a supplier risk level as a structured value or derive one from supplier scores.
- `supplier_assessment` holds a score only when the mapped cell is exactly an integer 1-5; anything else is `null` with a named problem. Whether a supplier's scale means the same as Turva's is a clinical judgement, so these values are never copied into the hazard's `initial` or `residual`.
- **Completeness invariant:** `rows_seen` equals `candidates + unreadable`, and every row index in the located table appears exactly once. An extractor that cannot account for a row must record it as unreadable rather than omit it. A document with no locatable hazard table is a run with zero candidates and one unreadable item describing why, not an empty success.
- `source_sha256` must equal the source's current checksum. An extraction record is immutable once committed.

This shape matches the `Extraction` and `ExtractionRow` types already used by the props-only review component (`frontend/src/lib/safety/types.ts`), with added identities, locations, counts and unreadable items. The component's types remain provisional until the route exists.

## Review decisions

`reviews/EXT-001.yaml` is a list to which entries are appended, one decision per commit, so the commit author is the decider and the commit time the decision time.

```yaml
- item: C-001
  decision: promoted # promoted | linked | excluded | acknowledged | revoked
  hazard: HAZ-004
  opened_version: 6f1e0c9b2a8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f
- item: C-002
  decision: excluded
  reason: >
    Reminder service is not enabled in this deployment; confirmed with the
    Federation's digital lead.
  opened_version: 0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3
- item: U-001
  decision: acknowledged
  reason: >
    Merged row covers H-03 and H-04; both transcribed by hand as HAZ-005 and
    HAZ-006 against appendix B of the original.
  hazards: [HAZ-005, HAZ-006]
  opened_version: 1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4
```

- `promoted` creates a new hazard in the **same commit** as the decision and the regenerated hazard log, under the repository lock and the opened-version precondition ([ADR 0004](adr/0004-serialised-safety-file-saves.md)). The CSO enters local severity and likelihood; the form may show the supplier's values alongside but must not prefill them.
- `linked` records that a candidate is covered by an existing hazard, which gains the `source` reference in the same commit.
- `excluded` and `acknowledged` require a non-empty `reason`. `promoted`, `linked` and `excluded` apply to candidates; `acknowledged` applies only to unreadable items and names any hazards transcribed by hand from them.
- `revoked` withdraws an earlier decision with a reason; it never deletes the hazard it produced, which is closed through the ordinary hazard rules if appropriate. Earlier entries are never edited: the storage layer compares the parsed list with the previous commit's and refuses anything other than an append.
- An item without a non-revoked decision is **outstanding**. A source reports "review complete" only when no item in its latest extraction is outstanding. That is a statement about review, not proof that the extraction found everything.

### Hazard frontmatter addition

```yaml
source:
  - ref: SRC-001/EXT-001/C-001
    supplier_id: H-01
```

A list, because a local hazard may cover several supplier hazards. Every `ref` must resolve to a candidate or unreadable item whose decision names this hazard, and vice versa, enforced like the hazard-mitigation reciprocity rule. This is deliberately not Quill's version-1 `source` shape; Quill-shaped fields remain refused, not migrated (see [the port decisions](quill-port.md)).

## Accepted input

| Input                                     | Outcome                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DOCX (OOXML word-processing package)      | Stored. Type detected from content (ZIP container and main document part), not the extension               |
| PDF with a text layer                     | Stored                                                                                                     |
| PDF without a text layer (a scan)         | Stored as evidence; its extraction records one `no_text_layer` unreadable item. OCR remains a stretch goal |
| Legacy `.doc`, `.docm`, `.rtf`, `.odt`    | Refused before writing. Macro-enabled packages are never stored                                            |
| Encrypted or password-protected document  | Refused before writing: Turva could not show it to the reviewer                                            |
| Over the size limit                       | Refused before writing. The limit is a decision for review (see below)                                     |
| Malformed or truncated file               | Refused before writing, with the parser's reason. Not stored as a partial original                         |
| Byte-identical to an existing source      | Refused, naming the existing `SRC`. A withdrawn duplicate is not silently reinstated                       |
| Same supplier reference/version, new hash | Accepted only with explicit confirmation and a reason; both sources show the clash                         |

Parsing treats the document as untrusted: bounded decompression, no external entity resolution, no fetching of linked or embedded remote content, and no execution of macros or PDF scripts. Originals are served for download only, as attachments with `X-Content-Type-Options: nosniff`, read from a snapshot at a named version; they are never rendered inline as HTML.

## Rejected cases (fictional)

Each is a required negative test for the implementing issues, not a shipped behaviour.

1. **Duplicate upload.** A CSO uploads `EXR CSCR v3.1 FINAL.docx` again under a new name. The checksum matches `SRC-001`; nothing is written and the response names `SRC-001`.
2. **Malformed input.** A `.docx` truncated mid-transfer fails package parsing. Nothing is written; no `SRC` number is allocated.
3. **Renamed legacy file.** `report.docx` is a `.doc` binary. Content detection refuses it despite the extension.
4. **Access.** An organisation administrator with no current named-file authority ([ADR 0006](adr/0006-named-file-teams-and-live-appointments.md)) requests upload, extraction, a decision or the original's download. All are refused; administration is not evidence authority. A collaborator whose appointment has ended is refused the same way, even though their earlier decisions remain attributed to them.
5. **Failed write.** The commit fails after the original is staged. The working tree is left dirty for inspection and blocks later saves, as for hazards today; it is not reset, and no index row points at an uncommitted source. Bytes are written to a temporary file outside the repository and checksummed before being moved in, so a half-written original is never staged.
6. **Opened-version conflict.** Two CSOs open the same extraction. One promotes `C-001`; the other, holding the older version, tries to exclude it. The second save is rejected under the lock; their draft decision and reason are retained in the client for comparison. Turva does not merge or retry with a fresh HEAD.
7. **Checksum drift.** A file under `sources/SRC-001/original.docx` is altered outside Turva. Readers refuse the source and every extraction that names it, rather than displaying candidates against different bytes.
8. **Silent omission.** An extractor returns two candidates for a three-row table and no unreadable item. The completeness invariant fails and the extraction is refused, not saved.
9. **Supplier score copied.** A client submits a promotion whose local `initial` equals the supplier's values without the CSO entering them. The service accepts only scores from the CSO's form fields; a test asserts that promotion with no local scores is refused rather than defaulted.

## Schema version

These additions change the on-disk contract, so they need an explicit manifest change and upgrade path. Versions 1 and 2 already mean "owner-only" and "file team"; adding sources as version 3 would force a file team on every file that wants supplier input. The proposal is therefore a decision point for review:

- **Option A:** `schema_version: 3` implies version 2 plus sources, with explicit adoption like the version-2 team upgrade.
- **Option B:** keep `schema_version` for structure and add an explicit `capabilities: [supplier-sources]` list to the manifest, refused by readers that do not understand it.

Either way, a file without the declaration must refuse a stray `sources/` directory or hazard `source` field, and there is no automatic bulk upgrade.

## Decisions needed before acceptance

1. Option A or B above.
2. The original size limit (a starting proposal of 25 MB) and whether Git LFS is ruled out. This proposal assumes plain Git objects: LFS would put evidence outside the repository and break the self-contained clone.
3. **Mistaken uploads.** Append-only history means an original uploaded in error, including one that unexpectedly contains personal data, cannot be removed by Turva. Proposed: an explicit pre-upload confirmation that the document contains no patient data, plus a documented out-of-band administrative procedure (outside Turva, recorded as an incident) for the rare history rewrite. This needs a governance decision, not an engineering default.
4. Whether supplier scores may be shown beside the local score inputs, or only on the candidate view.
5. Whether a generated provenance appendix (source identifiers, supplier-stated versions and checksums; no supplier text) belongs in the PDF export. Including supplier content in exports, federation or sharing is out of scope here: supplier documents carry their own licence and confidentiality, which is not Turva's AGPL.

## Proposed amendment to safety-file-layout.md

On acceptance, add to [safety-file-layout.md](safety-file-layout.md): the `sources/` tree and identifiers above; the `source.yaml`, extraction and review shapes; the hazard `source` field; the manifest declaration chosen in "Schema version"; and these validation rules after the existing eight:

- **Rule 9:** A source's original exists, has the recorded size and SHA-256, and has not changed since it was first committed
- **Rule 10:** Every extraction's `source_sha256` matches its source, and its counts and row indices satisfy the completeness invariant
- **Rule 11:** Extraction records and earlier review entries are never modified; reviews change only by appending
- **Rule 12:** Every hazard `source` reference resolves, and the decision it resolves to names that hazard, in both directions
- **Rule 13:** `excluded`, `acknowledged`, `revoked`, `withdrawn` and `superseded` carry a non-empty reason or reference

The service layer, not the file reader, additionally refuses a promotion whose local scores were not supplied by the acting CSO; Git cannot distinguish a copied score from an entered one after the fact.

## Proposed TH-010 update

On acceptance, extend the TH-010 narrative in [SAFETY.md](../SAFETY.md) with planned controls: byte-identical originals verified by checksum; candidates and unreadable items stored with exact locations and verbatim cells; a completeness invariant that refuses unaccounted rows; per-item attributable decisions with required reasons for exclusion and acknowledgement; supplier and local assessments kept apart with no score copying; and review completion reported as a review status, not as extraction completeness. Residual risk to record: an extractor can still mis-split a row or map the wrong column while satisfying the counts, so CSO comparison against the visible original remains the primary control. Severity and likelihood stay at 4 and 3, and the hazard stays open, until controls ship and are tested against a real supplier document.
