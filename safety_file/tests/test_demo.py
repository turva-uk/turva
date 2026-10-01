"""Tests for the demo safety file.

The demo is built through the production storage layer, so these double as
end-to-end coverage: validation, identifier allocation, cross-references, hazard
log generation and commit attribution all have to work for the demo to build.

One test here exists because of a mistake made while writing the demo. The
hand-written residual risk statement claimed every hazard had been reduced to
risk level 2 or below, while two hazards derived level 3. Nothing caught it,
because prose and data were not compared. That is the same class of defect as
hazard TH-001 - a safety case that reads as more complete than it is - so it
gets a test.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from demo.build import build  # noqa: E402


@pytest.fixture(scope="module")
def demo(tmp_path_factory):
    """Build the demo once for this module."""
    return build(tmp_path_factory.mktemp("demo") / "safety-file", force=True)


class TestDemoBuilds:
    def test_validates_cleanly(self, demo):
        assert demo.validate() == []

    def test_has_the_expected_content(self, demo):
        assert len(demo.hazards()) == 6
        assert len(demo.mitigations()) == 7

    def test_working_tree_is_clean(self, demo):
        """Everything written was committed."""
        assert demo.is_clean

    def test_history_has_multiple_named_contributors(self, demo):
        """The demo should show a realistic multi-person audit trail."""
        commits = demo.history(limit=200)
        contributors = {commit.author_email for commit in commits}
        assert len(contributors) >= 3
        assert all("@" in email for email in contributors)

    def test_every_commit_is_attributed_to_a_person_not_a_service_account(self, demo):
        for commit in demo.history(limit=200):
            assert commit.author_email.endswith(".example.nhs.uk"), (
                f"{commit.short_sha} attributed to {commit.author_email}, which is "
                "not one of the demo's named contributors - commit attribution "
                "has fallen back to a default identity"
            )

    def test_each_hazard_has_its_own_history(self, demo):
        for hazard in demo.hazards():
            history = demo.hazard_history(hazard.id)
            assert history, f"{hazard.id} has no recorded history"

    def test_uses_reserved_example_domains_only(self, demo):
        """No real organisation's domain, and nothing that could resolve."""
        for hazard in demo.hazards():
            assert ".example." in hazard.owner


class TestNarrativeMatchesDerivedData:
    """Guard against the safety case report claiming something the data denies."""

    def test_residual_risk_statement_names_every_hazard_above_level_two(self, demo):
        report = (demo.root / "docs" / "clinical-safety-case-report.md").read_text(encoding="utf-8")
        elevated = [hazard for hazard in demo.hazards() if hazard.residual.risk_level > 2]
        for hazard in elevated:
            assert hazard.id in report, (
                f"{hazard.id} derives residual risk level "
                f"{hazard.residual.risk_level}, but the safety case report does not "
                "mention it. A report that does not name its elevated residual "
                "risks reads as more reassuring than the data supports."
            )

    def test_every_hazard_above_level_two_has_a_justification(self, demo):
        """The acceptability criteria require one, so check rather than trust."""
        for hazard in demo.hazards():
            if hazard.residual.risk_level > 2:
                assert hazard.justification.strip(), (
                    f"{hazard.id} is at residual risk level "
                    f"{hazard.residual.risk_level} with no justification"
                )

    def test_no_open_hazard_blocks_go_live(self, demo):
        blocking = [
            hazard.id
            for hazard in demo.hazards()
            if hazard.status == "open" and hazard.requires_elimination
        ]
        assert blocking == [], (
            f"{', '.join(blocking)} at residual risk level 4 or 5. The demo is "
            "meant to represent a safety file that could go live."
        )

    def test_hazard_log_counts_match_the_hazard_files(self, demo):
        """The generated log is derived, so it cannot disagree - prove it."""
        log = (demo.root / "docs" / "hazards" / "index.md").read_text(encoding="utf-8")
        assert f"Hazards recorded: **{len(demo.hazards())}**" in log
        assert f"Mitigations: **{len(demo.mitigations())}**" in log


class TestMitigationHierarchy:
    #: Hazards knowingly mitigated only by warnings or procedures. Both are
    #: documented as such in the safety file. Adding to this list should be a
    #: deliberate act, which is the point of pinning it.
    KNOWN_WEAK_CONTROL_HAZARDS = ["HAZ-004", "HAZ-006"]

    def _weakly_mitigated(self, demo) -> list[str]:
        weak = []
        for hazard in demo.hazards():
            if not hazard.mitigations:
                continue
            controls = {
                demo.mitigation(identifier).control_type for identifier in hazard.mitigations
            }
            if controls <= {"warning", "procedural"}:
                weak.append(hazard.id)
        return weak

    def test_reliance_on_weak_controls_is_only_where_expected(self, demo):
        """Flag any hazard mitigated solely by a warning or a procedure.

        Not a failure in itself. The hierarchy of controls puts warnings and
        procedures at the bottom because they depend on a human reading,
        remembering and acting, so a hazard resting entirely on them is a weaker
        argument than one resting on design. The safety file should say so rather
        than let it pass as equivalent to a technical control.

        This test originally expected only HAZ-006 and found HAZ-004 as well.
        That was correct: digital exclusion has no technical control available,
        which is a real weakness and is now written down in the hazard rather
        than left implicit.
        """
        assert self._weakly_mitigated(demo) == self.KNOWN_WEAK_CONTROL_HAZARDS, (
            "the set of hazards relying only on weak controls has changed. If a "
            "hazard has been added here, the safety argument has weakened and its "
            "residual assessment needs revisiting by the Clinical Safety Officer."
        )

    @pytest.mark.parametrize("hazard_id", KNOWN_WEAK_CONTROL_HAZARDS)
    def test_weakly_mitigated_hazard_acknowledges_the_weakness(self, demo, hazard_id):
        """Each such hazard must say why a stronger control was not used."""
        hazard = demo.hazard(hazard_id)
        text = f"{hazard.justification}\n{hazard.body}".lower()
        assert any(word in text for word in ("warning", "procedural", "weakness")), (
            f"{hazard_id} relies only on weak controls but does not acknowledge "
            "it. An unexamined weak control reads like a strong one."
        )
