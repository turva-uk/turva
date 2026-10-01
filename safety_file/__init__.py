"""Turva's safety file storage layer.

A Clinical Safety Management File is a Git repository on disk holding a Zensical
documentation site. This package is the only code that reads or writes one. It
has no web framework dependency by design (see ADR 0001), so it is unit-testable
without a server and survives a framework change.

Layout and validation rules: `specifications/safety-file-layout.md`.

    >>> from pathlib import Path
    >>> from safety_file import Author, SafetyFileRepository
    >>> repo = SafetyFileRepository(Path("/srv/turva/safety-files/abc123"))
    >>> for hazard in repo.hazards():
    ...     print(hazard.id, hazard.residual.risk_level)
"""

from .errors import (
    FrontmatterError,
    GitError,
    InvalidRiskScore,
    NotASafetyFileError,
    SafetyFileError,
    SchemaVersionError,
    ValidationError,
)
from .git import Author, Commit
from .models import (
    CONTROL_TYPES,
    HAZARD_STATUSES,
    MITIGATION_STATUSES,
    Assessment,
    Hazard,
    Manifest,
    Mitigation,
)
from .repository import SafetyFileRepository, slugify
from .risk import (
    LIKELIHOOD_LABELS,
    RISK_LEVEL_LABELS,
    SEVERITY_LABELS,
    derive_risk_level,
    requires_elimination,
    risk_level_label,
)

__all__ = [
    "CONTROL_TYPES",
    "HAZARD_STATUSES",
    "LIKELIHOOD_LABELS",
    "MITIGATION_STATUSES",
    "RISK_LEVEL_LABELS",
    "SEVERITY_LABELS",
    "Assessment",
    "Author",
    "Commit",
    "FrontmatterError",
    "GitError",
    "Hazard",
    "InvalidRiskScore",
    "Manifest",
    "Mitigation",
    "NotASafetyFileError",
    "SafetyFileError",
    "SafetyFileRepository",
    "SchemaVersionError",
    "ValidationError",
    "derive_risk_level",
    "requires_elimination",
    "risk_level_label",
    "slugify",
]
