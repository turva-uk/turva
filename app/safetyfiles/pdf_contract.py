"""Controlled text scope of the DCB0160 download, not repository navigation."""

from safety_file.errors import SafetyFileError

# Adding a page to mkdocs.yml must not silently alter a reviewed download.
# Individual hazard narratives and mitigation evidence are explicit appendices;
# the generated log alone does not contain all of those fields.
PDF_PAGES = (
    ("index.md", "Overview"),
    ("clinical-risk-management-plan.md", "Clinical risk management plan"),
    ("hazards/index.md", "Hazard log"),
    ("clinical-safety-case-report.md", "Clinical safety case report"),
)


class PDFExportError(SafetyFileError):
    """No complete, supported PDF could be produced. Never serve a partial one."""
