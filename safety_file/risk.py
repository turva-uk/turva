"""Derivation of risk level from severity and likelihood.

This module is safety-critical. Risk level is *derived*, never entered - see
`specifications/core-specification.md`. A user who could select a risk level
directly could downgrade a serious risk without changing their own assessment of
its severity or likelihood, which is the failure this module exists to prevent
(hazard TH-008 in SAFETY.md).

The matrix is written as an explicit table rather than an arithmetic formula.
A formula would be shorter and would be wrong: the published matrix is not a
simple product, and inventing one that approximates it would silently disagree
with the standard in individual cells.
"""

from __future__ import annotations

from .errors import InvalidRiskScore

#: Lowest and highest valid score on both scales.
MIN_SCORE = 1
MAX_SCORE = 5

SEVERITY_LABELS: dict[int, str] = {
    1: "Minor",
    2: "Significant",
    3: "Considerable",
    4: "Major",
    5: "Catastrophic",
}

LIKELIHOOD_LABELS: dict[int, str] = {
    1: "Very low",
    2: "Low",
    3: "Medium",
    4: "High",
    5: "Very high",
}

RISK_LEVEL_LABELS: dict[int, str] = {
    1: "Acceptable",
    2: "Acceptable if cost of reduction exceeds benefit",
    3: "Undesirable",
    4: "Mandatory elimination",
    5: "Unacceptable",
}

# Risk level by (likelihood, severity), following the DCB0129 5x5 matrix.
#
# Rows are likelihood 1-5, columns are severity 1-5:
#
#                      severity
#                   1   2   3   4   5
#   likelihood 1    1   1   2   2   3
#              2    1   2   3   3   4
#              3    2   3   3   4   5
#              4    2   3   4   4   5
#              5    3   4   4   5   5
#
# Verified against the two worked examples preserved in
# specifications/archive/architecture/vmpt.md:
#   severity 4, likelihood 3 -> 4 ("Mandatory risk elimination")
#   severity 4, likelihood 1 -> 2 ("Acceptable with justification")
# Both are asserted in the test suite as golden vectors.
#
# NOTE: this table should be checked against the current published DCB0129
# matrix by the Clinical Safety Officer and the check recorded, rather than
# trusted because it is in code. It is the kind of table that is easy to
# transcribe subtly wrongly and hard to notice afterwards.
_RISK_MATRIX: tuple[tuple[int, ...], ...] = (
    (1, 1, 2, 2, 3),
    (1, 2, 3, 3, 4),
    (2, 3, 3, 4, 5),
    (2, 3, 4, 4, 5),
    (3, 4, 4, 5, 5),
)


def _validate_score(value: object, name: str) -> int:
    """Return `value` as a valid 1-5 score, or raise.

    Rejects rather than coerces. A severity recorded as "4" or 4.5 or True is a
    data-quality problem in a safety record, and quietly accepting it would hide
    the fact that something upstream is wrong.
    """
    if isinstance(value, bool) or not isinstance(value, int):
        raise InvalidRiskScore(
            f"{name} must be an integer between {MIN_SCORE} and {MAX_SCORE}, "
            f"got {value!r} of type {type(value).__name__}"
        )
    if not MIN_SCORE <= value <= MAX_SCORE:
        raise InvalidRiskScore(f"{name} must be between {MIN_SCORE} and {MAX_SCORE}, got {value}")
    return value


def derive_risk_level(severity: int, likelihood: int) -> int:
    """Return the derived risk level (1-5) for a severity and likelihood.

    >>> derive_risk_level(severity=4, likelihood=3)
    4
    >>> derive_risk_level(severity=4, likelihood=1)
    2
    """
    severity = _validate_score(severity, "severity")
    likelihood = _validate_score(likelihood, "likelihood")
    return _RISK_MATRIX[likelihood - 1][severity - 1]


def risk_level_label(risk_level: int) -> str:
    """Return the human-readable meaning of a derived risk level."""
    try:
        return RISK_LEVEL_LABELS[risk_level]
    except KeyError:
        raise InvalidRiskScore(f"risk level must be 1-5, got {risk_level!r}") from None


def requires_elimination(risk_level: int) -> bool:
    """Whether this risk level blocks go-live.

    Risk levels 4 and 5 must be reduced before deployment. The clinical risk
    management plan states this; encoding it here means the application can
    enforce it rather than relying on a reader noticing.
    """
    return risk_level >= 4
