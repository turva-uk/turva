"""TH-003: final YAML block scalars must survive unrelated evidence saves."""

import pytest

from safety_file.frontmatter import parse, serialise


@pytest.mark.parametrize(
    "value", ["A report.", "A report.\n", "A report.\n\n", "First line.\nSecond line.\n"]
)
def test_final_block_scalar_keeps_its_trailing_newlines(value):
    metadata = {"id": "MIT-001", "evidence": value}
    restored, body = parse(serialise(metadata, "Recorded narrative."))
    assert restored == metadata
    assert body == "Recorded narrative.\n"
