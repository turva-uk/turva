"""Tests for safety artefact validation.

These encode the rules in `specifications/safety-file-layout.md`. Each test
names the rule it protects, so a failure points at the decision rather than just
at the line.
"""

from __future__ import annotations

from datetime import date

import pytest

from safety_file.errors import InvalidRiskScore, ValidationError
from safety_file.models import Assessment, Hazard, Manifest, Mitigation


class TestAssessment:
    def test_risk_level_is_derived(self):
        assert Assessment(severity=4, likelihood=3).risk_level == 4

    def test_risk_level_is_not_serialised(self):
        """Rule: risk level is derived, never stored."""
        assert Assessment(severity=4, likelihood=3).to_dict() == {
            "severity": 4,
            "likelihood": 3,
        }

    def test_stored_risk_level_is_rejected_on_read(self):
        """A file containing risk_level is a file that can contradict itself."""
        with pytest.raises(ValidationError, match="risk_level"):
            Assessment.from_dict({"severity": 4, "likelihood": 3, "risk_level": 1}, "initial")

    def test_missing_fields_are_named(self):
        with pytest.raises(ValidationError, match="likelihood"):
            Assessment.from_dict({"severity": 4}, "initial")

    def test_invalid_score_is_rejected_at_construction(self):
        """An invalid Assessment cannot exist, even briefly."""
        with pytest.raises(InvalidRiskScore):
            Assessment(severity=9, likelihood=1)


class TestHazardIdentity:
    @pytest.mark.parametrize("bad_id", ["HAZ-1", "haz-001", "HAZ-0001", "H-001", "MIT-001", ""])
    def test_malformed_identifiers_are_rejected(self, bad_id, hazard):
        with pytest.raises(ValidationError, match="hazard id"):
            Hazard(
                id=bad_id,
                title=hazard.title,
                status="open",
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=hazard.initial,
                residual=hazard.residual,
            )

    def test_empty_title_is_rejected(self, hazard):
        with pytest.raises(ValidationError, match="title"):
            Hazard(
                id="HAZ-001",
                title="   ",
                status="open",
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=hazard.initial,
                residual=hazard.residual,
            )

    def test_unknown_status_is_rejected(self, hazard):
        with pytest.raises(ValidationError, match="status"):
            Hazard(
                id="HAZ-001",
                title=hazard.title,
                status="mitigated",  # not a real status
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=hazard.initial,
                residual=hazard.residual,
            )


class TestResidualCannotExceedInitial:
    """Layout rule 6.

    The realistic failure is transposition - typing the initial and residual
    figures the wrong way round - which would record a mitigation as having made
    things worse, or worse, record a reduction that never happened.
    """

    def test_residual_severity_above_initial_is_rejected(self, hazard):
        with pytest.raises(ValidationError, match="residual severity"):
            Hazard(
                id="HAZ-001",
                title=hazard.title,
                status="open",
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=Assessment(severity=2, likelihood=3),
                residual=Assessment(severity=4, likelihood=3),
            )

    def test_residual_likelihood_above_initial_is_rejected(self, hazard):
        with pytest.raises(ValidationError, match="residual likelihood"):
            Hazard(
                id="HAZ-001",
                title=hazard.title,
                status="open",
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=Assessment(severity=4, likelihood=2),
                residual=Assessment(severity=4, likelihood=4),
            )

    def test_equal_assessments_are_allowed(self, hazard):
        """A hazard may be recorded before any mitigation exists."""
        Hazard(
            id="HAZ-001",
            title=hazard.title,
            status="open",
            owner=hazard.owner,
            created=hazard.created,
            updated=hazard.updated,
            initial=Assessment(severity=3, likelihood=3),
            residual=Assessment(severity=3, likelihood=3),
        )


class TestClosedHazardsNeedJustification:
    """Layout rule 7, and the "never deleted, only closed" rule it supports."""

    def test_closing_without_justification_is_rejected(self, hazard):
        with pytest.raises(ValidationError, match="justification"):
            Hazard(
                id="HAZ-001",
                title=hazard.title,
                status="closed",
                owner=hazard.owner,
                created=hazard.created,
                updated=hazard.updated,
                initial=hazard.initial,
                residual=hazard.residual,
            )

    def test_closing_with_justification_is_allowed(self, hazard):
        Hazard(
            id="HAZ-001",
            title=hazard.title,
            status="closed",
            owner=hazard.owner,
            created=hazard.created,
            updated=hazard.updated,
            initial=hazard.initial,
            residual=hazard.residual,
            justification="Pathway withdrawn; system no longer deployed.",
        )


class TestHazardRoundTrip:
    def test_frontmatter_round_trips(self, hazard):
        restored = Hazard.from_frontmatter(hazard.to_frontmatter(), hazard.body)
        assert restored == hazard

    def test_dates_accept_iso_strings(self, hazard):
        """YAML may give a date or a string depending on quoting."""
        data = hazard.to_frontmatter()
        data["created"] = "2026-02-11"
        assert Hazard.from_frontmatter(data).created == date(2026, 2, 11)

    def test_malformed_date_is_rejected(self, hazard):
        data = hazard.to_frontmatter()
        data["created"] = "11/02/2026"
        with pytest.raises(ValidationError, match="ISO date"):
            Hazard.from_frontmatter(data)

    def test_missing_required_field_is_named(self, hazard):
        data = hazard.to_frontmatter()
        del data["residual"]
        with pytest.raises(ValidationError, match="residual"):
            Hazard.from_frontmatter(data)

    def test_requires_elimination_reflects_residual_risk(self, hazard):
        assert hazard.residual.risk_level == 2
        assert hazard.requires_elimination is False

        blocking = Hazard.from_frontmatter(
            {**hazard.to_frontmatter(), "residual": {"severity": 4, "likelihood": 3}}
        )
        assert blocking.requires_elimination is True


class TestMitigation:
    def test_control_type_must_be_in_the_hierarchy(self, mitigation):
        with pytest.raises(ValidationError, match="control_type"):
            Mitigation(
                id="MIT-001",
                title=mitigation.title,
                status="implemented",
                owner=mitigation.owner,
                created=mitigation.created,
                updated=mitigation.updated,
                control_type="wishful",
            )

    def test_control_strength_orders_strongest_first(self):
        def strength(control_type: str) -> int:
            return Mitigation(
                id="MIT-001",
                title="x",
                status="proposed",
                owner="a@b.example",
                created=date(2026, 1, 1),
                updated=date(2026, 1, 1),
                control_type=control_type,
            ).control_strength

        assert (
            strength("elimination")
            < strength("technical")
            < strength("warning")
            < strength("procedural")
        )

    def test_round_trips(self, mitigation):
        assert (
            Mitigation.from_frontmatter(mitigation.to_frontmatter(), mitigation.body) == mitigation
        )

    def test_bad_hazard_reference_is_rejected(self, mitigation):
        with pytest.raises(ValidationError, match="hazard reference"):
            Mitigation(
                id="MIT-001",
                title=mitigation.title,
                status="implemented",
                owner=mitigation.owner,
                created=mitigation.created,
                updated=mitigation.updated,
                control_type="technical",
                hazards=["HAZARD-1"],
            )


class TestManifest:
    def test_round_trips(self):
        manifest = Manifest(
            schema_version=1,
            project_id="0b9f4e2a-5c7d-4c1e-9a3f-2d8e6b1a4c70",
            name="BP@Home",
            standard="DCB0160",
            template="dcb0160-deployment",
            template_version=1,
            created=date(2026, 2, 10),
        )
        assert Manifest.from_dict(manifest.to_dict()) == manifest

    def test_unknown_standard_is_rejected(self):
        with pytest.raises(ValidationError, match="standard"):
            Manifest(
                schema_version=1,
                project_id="x",
                name="y",
                standard="ISO14971",
                template="t",
                template_version=1,
                created=date(2026, 2, 10),
            )
