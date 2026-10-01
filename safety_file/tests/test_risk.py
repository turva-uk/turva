"""Tests for the derived risk matrix.

This is the module `specifications/architecture-principles.md` requires to have
complete coverage, and hazard TH-008 in SAFETY.md is the reason: a miscalculated
risk level presents a serious risk as acceptable.
"""

from __future__ import annotations

import itertools

import pytest

from safety_file.errors import InvalidRiskScore
from safety_file.risk import (
    MAX_SCORE,
    MIN_SCORE,
    RISK_LEVEL_LABELS,
    derive_risk_level,
    requires_elimination,
    risk_level_label,
)


class TestGoldenVectors:
    """The two worked examples preserved in the archived VMPT specification.

    These are the only documented assertions about what this matrix should
    produce, so they are pinned as golden vectors. If a future change to the
    matrix breaks one of them, that change needs a Clinical Safety Officer's
    sign-off, not a test update.
    """

    def test_major_severity_medium_likelihood_requires_elimination(self):
        # vmpt.md: "Severity: 4 ... Likelihood: 3 ... Risk Level: 4
        # (Mandatory risk elimination)"
        assert derive_risk_level(severity=4, likelihood=3) == 4

    def test_major_severity_very_low_likelihood_is_acceptable_with_justification(self):
        # vmpt.md: "Severity: 4 (Major - unchanged) ... Likelihood: 1
        # (Very low - controlled by design) ... Risk Level: 2"
        assert derive_risk_level(severity=4, likelihood=1) == 2


class TestMatrixShape:
    def test_every_valid_combination_yields_a_level_in_range(self):
        for severity, likelihood in itertools.product(range(1, 6), repeat=2):
            level = derive_risk_level(severity=severity, likelihood=likelihood)
            assert 1 <= level <= 5, f"S{severity} L{likelihood} gave {level}"

    def test_severity_outweighs_likelihood(self):
        """The matrix is deliberately asymmetric: severity dominates.

        Swapping severity and likelihood does *not* give the same answer. Where
        they differ, the combination with the higher severity is rated at least
        as risky as the one with the higher likelihood - for example S5 L3
        derives 5 while S3 L5 derives 4.

        This is a clinical judgement, not an accident: a hazard that could kill
        several people occasionally warrants more attention than one that
        inconveniences someone every time. An earlier version of this test
        asserted symmetry, which was an assumption about the matrix rather than
        a property of it, and it was wrong.
        """
        for severity, likelihood in itertools.product(range(1, 6), repeat=2):
            if severity <= likelihood:
                continue
            severity_dominant = derive_risk_level(severity=severity, likelihood=likelihood)
            likelihood_dominant = derive_risk_level(severity=likelihood, likelihood=severity)
            assert severity_dominant >= likelihood_dominant, (
                f"S{severity} L{likelihood} derived {severity_dominant}, but "
                f"S{likelihood} L{severity} derived {likelihood_dominant}; "
                "severity should never count for less than likelihood"
            )

    def test_risk_is_monotonic_in_severity(self):
        """Holding likelihood fixed, more severe is never less risky."""
        for likelihood in range(1, 6):
            levels = [
                derive_risk_level(severity=severity, likelihood=likelihood)
                for severity in range(1, 6)
            ]
            assert levels == sorted(levels), f"L{likelihood}: {levels}"

    def test_risk_is_monotonic_in_likelihood(self):
        """Holding severity fixed, more likely is never less risky."""
        for severity in range(1, 6):
            levels = [
                derive_risk_level(severity=severity, likelihood=likelihood)
                for likelihood in range(1, 6)
            ]
            assert levels == sorted(levels), f"S{severity}: {levels}"

    def test_corners(self):
        assert derive_risk_level(severity=1, likelihood=1) == 1
        assert derive_risk_level(severity=5, likelihood=5) == 5

    def test_catastrophic_harm_is_never_merely_acceptable(self):
        """Severity 5 never derives risk level 1, at any likelihood.

        A clinical judgement worth protecting: multiple deaths should never be
        presented as requiring no further action, however unlikely.
        """
        for likelihood in range(1, 6):
            assert derive_risk_level(severity=5, likelihood=likelihood) > 1


class TestValidation:
    @pytest.mark.parametrize("bad", [0, 6, -1, 100])
    def test_out_of_range_scores_are_rejected(self, bad):
        with pytest.raises(InvalidRiskScore):
            derive_risk_level(severity=bad, likelihood=3)
        with pytest.raises(InvalidRiskScore):
            derive_risk_level(severity=3, likelihood=bad)

    @pytest.mark.parametrize("bad", ["4", 4.0, None, [4], {"severity": 4}])
    def test_non_integer_scores_are_rejected_not_coerced(self, bad):
        """A severity of "4" is a data-quality problem, not a 4.

        Coercing it would hide whatever upstream bug produced a string, and the
        same leniency would accept 4.9 as 4.
        """
        with pytest.raises(InvalidRiskScore):
            derive_risk_level(severity=bad, likelihood=3)

    def test_booleans_are_rejected_despite_being_ints(self):
        """True == 1 in Python, so bool needs an explicit guard."""
        with pytest.raises(InvalidRiskScore):
            derive_risk_level(severity=True, likelihood=3)

    def test_error_message_names_the_offending_field(self):
        with pytest.raises(InvalidRiskScore, match="likelihood"):
            derive_risk_level(severity=3, likelihood=9)

    def test_scale_bounds_are_what_the_specification_says(self):
        assert (MIN_SCORE, MAX_SCORE) == (1, 5)


class TestLabels:
    def test_every_level_has_a_label(self):
        for level in range(1, 6):
            assert risk_level_label(level)
        assert set(RISK_LEVEL_LABELS) == {1, 2, 3, 4, 5}

    def test_unknown_level_is_rejected(self):
        with pytest.raises(InvalidRiskScore):
            risk_level_label(7)


class TestGoLiveGate:
    @pytest.mark.parametrize(
        ("level", "blocks"),
        [(1, False), (2, False), (3, False), (4, True), (5, True)],
    )
    def test_levels_four_and_five_block_go_live(self, level, blocks):
        assert requires_elimination(level) is blocks
