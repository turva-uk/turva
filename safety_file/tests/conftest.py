"""Fixtures for the safety file tests.

Every test gets its own temporary directory and its own Git repository. Nothing
touches a real safety file, and no test depends on the developer's global Git
configuration - commit identity is always passed explicitly, which is the
behaviour under test.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from safety_file import Author, SafetyFileRepository
from safety_file.models import Assessment, Hazard, Mitigation

TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "safety-file-templates" / "dcb0160-deployment"


@pytest.fixture
def author() -> Author:
    return Author(name="Dr Anita Patel", email="a.patel@riverbank.example.nhs.uk")


@pytest.fixture
def other_author() -> Author:
    return Author(name="Joseph Okafor", email="j.okafor@riverbank.example.nhs.uk")


@pytest.fixture
def template_values() -> dict[str, str]:
    return {
        "organisation": "Riverbank Health Federation",
        "cso_name": "Dr Anita Patel",
        "cso_registration": "GMC 7654321",
        "cso_email": "a.patel@riverbank.example.nhs.uk",
        "intended_use": "Remote blood pressure monitoring for hypertension review.",
        "clinical_context": "Primary care hypertension management.",
        "risk_acceptability_criteria": "No open hazard above residual risk level 3.",
        "governance": "Reviewed by the Federation clinical governance group.",
        "residual_risk_statement": "All residual risks are at or below level 3.",
    }


@pytest.fixture
def repo(tmp_path: Path, author: Author, template_values: dict[str, str]) -> SafetyFileRepository:
    """An empty, newly created safety file."""
    return SafetyFileRepository.create(
        tmp_path / "safety-file",
        name="BP@Home remote blood pressure monitoring",
        standard="DCB0160",
        template_dir=TEMPLATE_DIR,
        values=template_values,
        author=author,
        created=date(2026, 2, 10),
    )


@pytest.fixture
def hazard() -> Hazard:
    return Hazard(
        id="HAZ-001",
        title="Severe hypertension reading is not escalated",
        status="open",
        owner="a.patel@riverbank.example.nhs.uk",
        created=date(2026, 2, 11),
        updated=date(2026, 2, 11),
        initial=Assessment(severity=4, likelihood=3),
        residual=Assessment(severity=4, likelihood=1),
        cause="Readings are reviewed in a weekly batch.",
        effect="Delay to treatment the pathway requires within 24 hours.",
        harm="Avoidable stroke or hypertensive emergency.",
        body="## Notes\n\nIdentified during the pathway walkthrough.",
    )


@pytest.fixture
def mitigation() -> Mitigation:
    return Mitigation(
        id="MIT-001",
        title="Automated same-day flagging of readings above threshold",
        status="implemented",
        owner="j.okafor@riverbank.example.nhs.uk",
        created=date(2026, 2, 18),
        updated=date(2026, 3, 1),
        control_type="technical",
        evidence="Threshold logic covered by automated tests.",
    )
