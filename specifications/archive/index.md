# Archive

Superseded specifications, kept for provenance. **Nothing here describes the current system.** For that, start at [../index.md](../index.md).

| Document                                                 | What it is                                                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [spec-archive.md](spec-archive.md)                       | The original 1,026-line specification, superseded by [core-specification.md](../core-specification.md) in December 2025                                                                                                                                                 |
| [architecture/](architecture/)                           | Implementation-heavy architecture docs from the same era. `vmpt.md` is where the Git-repository-per-safety-file design was first written down, and is the source the current [architecture-principles.md](../architecture-principles.md) section was reconstructed from |
| [rationalisation-summary.md](rationalisation-summary.md) | The record of the December 2025 rewrite. Kept as a cautionary tale: it is the document that recorded dropping the Git architecture, and the loss went unnoticed for months                                                                                              |

## Links in here may dangle

These files are not maintained, and are deliberately not rewritten - editing an archived specification would falsify what it said at the time. Some of their internal links point at files that no longer exist:

- `architecture/backend.md` and `architecture/frontend.md` reference `database.md` and `authentication.md`, which were never written
- `architecture/vmpt.md` references `example_template/build.py`, a prototype removed in October 2026 when the real template system superseded it

Ruff is configured to skip this directory, because it formats Python code blocks inside Markdown and would otherwise rewrite the code samples in these documents.
