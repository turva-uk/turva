# ADR 0005: Controlled PDF exports from committed evidence

<!-- cspell:ignore pypdf -->

- **Status**: Implemented as a phase-one draft text export
- **Date**: 2026-11-11
- **Related**: [ADR 0004](0004-serialised-safety-file-saves.md), [funded scope](../phase-one-scope.md#6-single-document-download)

## Decision

Build the four explicitly named DCB0160 source documents through Zensical, extract their rendered articles and print them with WeasyPrint and one standalone stylesheet. Reuse the proven RCPCH approach, with [provenance and dependency review](../../app/safetyfiles/pdf-export-notice.md). Do not infer the download's contents from arbitrary repository navigation.

The generated hazard log does not contain every narrative or all mitigation evidence. Therefore the controlled scope also explicitly includes additional narratives for **all recorded hazards**, and fields/evidence/narratives for **all recorded mitigations**. These appendices show the exact recorded Markdown as text. A future source page is outside this scope until the policy is deliberately changed. Attachments are references, not embedded files.

The request carries the full opened HEAD. Under a clean shared snapshot, check that version, validate the file and capture the committed source pages plus typed artefacts. Refuse a committed hazard log that disagrees with the current canonical generator. Release the repository lock before rendering: the build reads only its immutable capture, so later saves cannot change the document it produces. Its cover and response headers cite the captured full SHA; every page is marked as a draft.

Cache privately outside repositories by manifest identity, source SHA, exporter/CSS/scope, storage/risk code, Python and runtime dependency identity. A complete temporary output is atomically moved into the cache; failed or truncated output is not served. The API checks the verified reader's visibility on every request, including cache hits, and returns `private, no-store`. The database stores no generated evidence.

## Resource and security boundary

- Repository `mkdocs.yml`, plugins and hooks are not executed. A trusted minimal configuration includes only the controlled source documents.
- This proof supports text, tables and ordinary links. Embedded media/active HTML or unsupported attributes fail visibly. Allowed print HTML is constrained; unrecognised formatting classes cannot import repository styles. Narratives in appendices are escaped text.
- No network or arbitrary local resources are fetched by the renderer. A blocked fetch fails the export even if WeasyPrint would otherwise continue with a warning. Attachment links are references only, never `file://` links into build directories.
- The rendering subprocess does not inherit application secrets or database credentials. It has 2 GiB virtual memory and 60 CPU seconds; Zensical has a 30-second wall timeout and the whole worker 90 seconds. Output is capped at 25 MiB. These are containment controls, **not a general-purpose untrusted-code sandbox**.
- Concurrent cache misses may render independently. Atomic replacement protects correctness, not total deployment resource consumption. Rate limits, capacity/load measurements, process-wide quotas and deployment timeouts remain operational work before real use.

## Evidence and limits

The integration test renders the fictional six-hazard/seven-mitigation demo through both real engines and extracts the PDF's pages, text and metadata with pypdf. Tests cover private/cached permissions, unverified users, source-version conflicts, a concurrent save during rendering, cache invalidation, truncated/failed output, missing pages/articles, prohibited resources and escaped narratives. The demo walkthrough includes download, cache and stale-page exercises.

This delivers a reproducible **draft text document**, not clinical judgement, approval, supplier extraction or completed safety-case authoring. The pre-release safety status still applies. Revisit the supported markup/asset policy against a real customer specimen; do not silently skip unsupported evidence. Revisit synchronous execution when measured build times approach deployment limits.
