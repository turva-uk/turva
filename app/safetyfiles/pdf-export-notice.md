# PDF exporter provenance

<!-- cspell:ignore CourtBouillon Kozea Pango DejaVu pypdf -->

Turva uses the rendered-article and standalone print-CSS approach from [RCPCH Digital Growth Charts documentation](https://github.com/rcpch/digital-growth-charts-documentation/tree/30831ffbb92293201ce384b973d186707b19d3b3/pdf-export), reviewed locally on 11 November 2026 at commit `30831ffbb92293201ce384b973d186707b19d3b3`. The implementation here adds a fixed text scope, explicit hazard/mitigation appendices, committed-source capture, resource restrictions, bounded subprocesses and a commit/renderer-specific cache. It does not copy repository plugins or allow network resources.

The upstream minimal project-specific code is MIT-licensed. Its notice is retained here for the adapted approach and print rules:

Copyright (c) 2026 The contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Dependency admission evidence

Checked the official PyPI metadata and upstream sources on 11 November 2026:

- WeasyPrint 70.0, maintained by CourtBouillon/Kozea, BSD-3-Clause; supports Python 3.10+. Used only to render the controlled assembled HTML, out of process. No current-version advisories were listed by PyPI at review. Native Pango and DejaVu fonts are installed in the application image. See [upstream licence](https://github.com/Kozea/WeasyPrint/blob/v70.0/LICENSE) and [security guidance](https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html#security).
- Beautiful Soup 4.15.0, MIT; supports Python 3.7+. Extracts and checks rendered articles using the standard-library HTML parser. No additional HTML parser dependency is needed.
- Zensical remains at the project's already validated 0.0.74 pin, MIT, rather than mixing this feature with the newer 0.1 line. The trusted build configuration explicitly lists the four source pages; the repository's config/plugins/hooks are not executed.
- pypdf 7.0.1 is a development-only dependency (BSD-3-Clause, Python 3.10+) used to extract and verify the real pipeline's output in tests, not to process uploads. Its official registry listed no current-version advisories at review; the [upstream licence](https://github.com/py-pdf/pypdf/blob/7.0.1/LICENSE) was checked.

All are direct runtime declarations, resolved by `s/lock`. The integration test builds a real safety file through both engines. Replacing the renderer affects build artefacts, not safety-file storage; cached output is invalidated by source, exporter/CSS/scope and renderer versions. These checks are not a guarantee against future advisories or rendering defects. Text extraction, visual review, permission tests and TH-007 remain relevant.
