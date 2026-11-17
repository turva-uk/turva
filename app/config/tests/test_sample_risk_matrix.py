"""The frontend's sample risk matrix agrees with the server's.

The safety components' stories and tests need risk levels that look like
the server's, so `frontend/src/test/safetyFile.ts` keeps a copy of the
matrix for sample data. The app never reads it: a level shown in the
interface comes from the server (TH-008). But a sample that disagreed with
the server would teach a reviewer the wrong level for a pair, and a story
is where people learn what a level looks like. So the copy is checked here,
cell by cell, against `safety_file/risk.py`.
"""

from __future__ import annotations

import re
from pathlib import Path

from django.conf import settings

from safety_file.risk import MAX_SCORE, MIN_SCORE, RISK_LEVEL_LABELS, derive_risk_level

SAMPLES = Path(settings.BASE_DIR) / "frontend" / "src" / "test" / "safetyFile.ts"


def sample_matrix() -> list[list[int]]:
    """`SAMPLE_RISK_MATRIX`'s rows, likelihood 1 to 5, as written in the sample file."""
    source = SAMPLES.read_text(encoding="utf-8")
    block = re.search(r"SAMPLE_RISK_MATRIX = \[(.*?)\] as const;", source, re.S)
    assert block, "SAMPLE_RISK_MATRIX was not found in safetyFile.ts"

    rows = re.findall(r"\[([0-9,\s]+)\]", block.group(1))

    return [[int(cell) for cell in row.split(",")] for row in rows]


def sample_labels() -> dict[int, str]:
    """`SAMPLE_RISK_LABELS`, as written in the sample file."""
    source = SAMPLES.read_text(encoding="utf-8")
    block = re.search(r"SAMPLE_RISK_LABELS = \{(.*?)\} as const;", source, re.S)
    assert block, "SAMPLE_RISK_LABELS was not found in safetyFile.ts"

    return {int(level): label for level, label in re.findall(r'(\d): "([^"]+)"', block.group(1))}


def test_every_cell_matches_the_server():
    matrix = sample_matrix()
    scores = range(MIN_SCORE, MAX_SCORE + 1)

    assert len(matrix) == len(scores)
    for likelihood in scores:
        for severity in scores:
            assert matrix[likelihood - 1][severity - 1] == derive_risk_level(
                severity, likelihood
            ), f"severity {severity}, likelihood {likelihood}"


def test_every_label_matches_the_server():
    assert sample_labels() == RISK_LEVEL_LABELS
