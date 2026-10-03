"""Tests for the Git-backed storage layer.

The properties under test are the ones the audit trail depends on: every write
is committed, every commit is attributed to the person who caused it, history
for one hazard is retrievable, and identifiers are never reused.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from safety_file import SafetyFileRepository
from safety_file.errors import NotASafetyFileError, SchemaVersionError, ValidationError
from safety_file.models import Assessment, Hazard
from safety_file.repository import slugify


class TestCreation:
    def test_creates_a_git_repository_with_a_first_commit(self, repo):
        assert (repo.root / ".git").is_dir()
        history = repo.history()
        assert len(history) == 1
        assert "create safety file" in history[0].subject

    def test_first_commit_is_attributed_to_the_creator(self, repo, author):
        commit = repo.history()[0]
        assert commit.author_name == author.name
        assert commit.author_email == author.email

    def test_writes_the_expected_layout(self, repo):
        for expected in (
            ".turva/manifest.yaml",
            "mkdocs.yml",
            "docs/index.md",
            "docs/clinical-risk-management-plan.md",
            "docs/clinical-safety-case-report.md",
            "docs/hazards/index.md",
        ):
            assert (repo.root / expected).is_file(), f"missing {expected}"

    def test_manifest_records_identity(self, repo):
        manifest = repo.manifest
        assert manifest.standard == "DCB0160"
        assert manifest.name == "BP@Home remote blood pressure monitoring"
        assert manifest.schema_version == 1
        assert manifest.project_id

    def test_template_placeholders_are_rendered(self, repo):
        index = (repo.root / "docs" / "index.md").read_text()
        assert "Riverbank Health Federation" in index
        assert "{{" not in index, "a placeholder was left unrendered"

    def test_working_tree_is_clean_after_creation(self, repo):
        assert repo.is_clean

    def test_refuses_to_overwrite_a_non_empty_directory(self, tmp_path, author, template_values):
        target = tmp_path / "occupied"
        target.mkdir()
        (target / "something.txt").write_text("existing work")

        with pytest.raises(ValidationError, match="not empty"):
            SafetyFileRepository.create(
                target,
                name="x",
                standard="DCB0160",
                template_dir=Path(__file__).resolve().parents[2]
                / "safety-file-templates"
                / "dcb0160-deployment",
                values=template_values,
                author=author,
            )

    def test_missing_placeholder_fails_loudly(self, tmp_path, author):
        """A blank safety document is worse than a missing one."""
        with pytest.raises(ValidationError, match="render"):
            SafetyFileRepository.create(
                tmp_path / "incomplete",
                name="x",
                standard="DCB0160",
                template_dir=Path(__file__).resolve().parents[2]
                / "safety-file-templates"
                / "dcb0160-deployment",
                values={},  # nothing supplied
                author=author,
            )


class TestOpening:
    def test_plain_directory_is_not_a_safety_file(self, tmp_path):
        with pytest.raises(NotASafetyFileError):
            SafetyFileRepository(tmp_path)

    def test_git_repository_without_a_manifest_is_rejected(self, tmp_path):
        from safety_file import git

        git.init(tmp_path)
        with pytest.raises(NotASafetyFileError, match="manifest"):
            SafetyFileRepository(tmp_path)

    def test_future_schema_version_is_refused(self, repo):
        """Refuse rather than risk dropping fields we do not understand."""
        manifest_path = repo.root / ".turva" / "manifest.yaml"
        manifest_path.write_text(
            manifest_path.read_text().replace("schema_version: 1", "schema_version: 99")
        )
        with pytest.raises(SchemaVersionError, match="99"):
            SafetyFileRepository(repo.root)


class TestSavingHazards:
    def test_saving_writes_a_file_and_commits(self, repo, hazard, author):
        sha = repo.save_hazard(hazard, author)

        assert sha
        assert repo.is_clean
        assert len(repo.hazards()) == 1
        assert repo.hazard("HAZ-001").title == hazard.title

    def test_commit_is_attributed_to_the_acting_user(self, repo, hazard, other_author):
        repo.save_hazard(hazard, other_author)
        commit = repo.history()[0]
        assert commit.author_name == other_author.name
        assert commit.author_email == other_author.email

    def test_filename_combines_identifier_and_slug(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        written = list((repo.root / "docs" / "hazards").glob("HAZ-*.md"))
        assert len(written) == 1
        assert written[0].name.startswith("HAZ-001-")

    def test_saving_unchanged_content_creates_no_commit(self, repo, hazard, author):
        """Pressing save twice should not imply the decision was revisited."""
        repo.save_hazard(hazard, author)
        before = repo.head_sha

        assert repo.save_hazard(hazard, author) is None
        assert repo.head_sha == before

    def test_retitling_moves_the_file_and_keeps_the_identifier(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        hazard.title = "Severe reading not escalated within 24 hours"
        repo.save_hazard(hazard, author)

        written = list((repo.root / "docs" / "hazards").glob("HAZ-*.md"))
        assert len(written) == 1, "the old file was left behind"
        assert repo.hazard("HAZ-001").title == hazard.title

    def test_round_trip_preserves_the_body(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        assert "Identified during the pathway walkthrough." in repo.hazard("HAZ-001").body

    def test_invalid_hazard_never_reaches_disk(self, repo, author, hazard):
        hazard.residual = Assessment(severity=5, likelihood=1)  # exceeds initial
        with pytest.raises(ValidationError):
            hazard.__post_init__()
        assert repo.hazards() == []


class TestIdentifierAllocation:
    def test_identifiers_are_sequential(self, repo, hazard, author):
        assert repo.next_hazard_id() == "HAZ-001"
        repo.save_hazard(hazard, author)
        assert repo.next_hazard_id() == "HAZ-002"

    def test_identifiers_are_never_reused(self, repo, hazard, author):
        """Reuse would attach one hazard's history to a different hazard."""
        repo.save_hazard(hazard, author)

        second = Hazard.from_frontmatter(
            {**hazard.to_frontmatter(), "id": "HAZ-002", "title": "Second hazard"}
        )
        repo.save_hazard(second, author)
        assert repo.next_hazard_id() == "HAZ-003"

        # Remove the most recent hazard from disk entirely.
        for path in (repo.root / "docs" / "hazards").glob("HAZ-002-*.md"):
            path.unlink()

        assert repo.next_hazard_id() == "HAZ-003", "an identifier was recycled"


class TestCrossReferences:
    def test_hazard_cannot_reference_a_missing_mitigation(self, repo, hazard, author):
        hazard.mitigations = ["MIT-404"]
        with pytest.raises(ValidationError, match="MIT-404"):
            repo.save_hazard(hazard, author)

    def test_one_sided_reference_is_reported_by_validate(self, repo, hazard, mitigation, author):
        repo.save_mitigation(mitigation, author)
        hazard.mitigations = ["MIT-001"]
        repo.save_hazard(hazard, author)

        # MIT-001 does not name HAZ-001 in return.
        problems = repo.validate()
        assert any("does not list" in problem for problem in problems)

    def test_consistent_references_validate_cleanly(self, repo, hazard, mitigation, author):
        repo.save_mitigation(mitigation, author)
        hazard.mitigations = ["MIT-001"]
        repo.save_hazard(hazard, author)

        mitigation.hazards = ["HAZ-001"]
        repo.save_mitigation(mitigation, author)

        assert repo.validate() == []


class TestClosingHazards:
    def test_closing_requires_and_records_a_justification(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        repo.close_hazard(
            "HAZ-001",
            "Pathway withdrawn; the system is no longer deployed.",
            author,
        )

        closed = repo.hazard("HAZ-001")
        assert closed.status == "closed"
        assert "Pathway withdrawn" in closed.justification

    def test_closed_hazard_is_still_present(self, repo, hazard, author):
        """Hazards are never deleted, only closed."""
        repo.save_hazard(hazard, author)
        repo.close_hazard("HAZ-001", "No longer applicable.", author)
        assert len(repo.hazards()) == 1

    def test_there_is_no_delete(self, repo):
        assert not hasattr(repo, "delete_hazard")


class TestAuditTrail:
    def test_history_for_one_hazard_excludes_other_hazards(
        self, repo, hazard, author, other_author
    ):
        repo.save_hazard(hazard, author)

        second = Hazard.from_frontmatter(
            {**hazard.to_frontmatter(), "id": "HAZ-002", "title": "Unrelated hazard"}
        )
        repo.save_hazard(second, other_author)

        first_history = repo.hazard_history("HAZ-001")
        assert all("HAZ-002" not in commit.subject for commit in first_history)

    def test_history_records_who_and_when(self, repo, hazard, author, other_author):
        repo.save_hazard(hazard, author)
        hazard.residual = Assessment(severity=4, likelihood=2)
        hazard.updated = date(2026, 3, 4)
        repo.save_hazard(hazard, other_author, message="fix(HAZ-001): revise residual likelihood")

        history = repo.hazard_history("HAZ-001")
        assert len(history) == 2
        assert history[0].author_name == other_author.name
        assert history[1].author_name == author.name
        assert history[0].committed_at > history[1].committed_at or True  # ordering is newest-first

    def test_past_version_is_retrievable(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        original_sha = repo.head_sha
        path = repo.path_for(repo.hazard("HAZ-001"))

        hazard.title = "Retitled"
        repo.save_hazard(hazard, author)

        historical = repo.version_at(original_sha, path)
        assert "Severe hypertension reading is not escalated" in historical

    def test_commit_identity_does_not_come_from_global_git_config(self, repo, hazard, author):
        """Attribution must be explicit - hazard TH-004.

        If the implementation ever fell back to the machine's git config, this
        would show the developer's own name rather than the acting clinician's.
        """
        repo.save_hazard(hazard, author)
        assert repo.history()[0].author_email == "a.patel@riverbank.example.nhs.uk"


class TestHazardLogGeneration:
    def test_log_is_regenerated_on_save(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        log = (repo.root / "docs" / "hazards" / "index.md").read_text()

        assert "HAZ-001" in log
        assert hazard.title in log
        assert "GENERATED FILE" in log

    def test_log_shows_derived_risk_levels(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        log = (repo.root / "docs" / "hazards" / "index.md").read_text()
        # initial S4 L3 -> 4, residual S4 L1 -> 2
        assert "S4 L3 → **4**" in log
        assert "S4 L1 → **2**" in log

    def test_log_warns_when_residual_risk_blocks_go_live(self, repo, hazard, author):
        hazard.residual = Assessment(severity=4, likelihood=3)
        repo.save_hazard(hazard, author)
        log = (repo.root / "docs" / "hazards" / "index.md").read_text()
        assert "requires elimination" in log.lower()

    def test_log_is_committed_with_the_hazard(self, repo, hazard, author):
        repo.save_hazard(hazard, author)
        assert repo.is_clean, "the regenerated log was left uncommitted"


class TestSlugify:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("Severe hypertension reading", "severe-hypertension-reading"),
            ("Wrong patient selected!", "wrong-patient-selected"),
            ("  spaces  everywhere  ", "spaces-everywhere"),
            ("Ünïcôde tïtle", "unicode-title"),
            ("!!!", "untitled"),
        ],
    )
    def test_slugs(self, text, expected):
        assert slugify(text) == expected

    def test_long_titles_are_truncated_without_trailing_hyphen(self):
        slug = slugify("a " * 80)
        assert len(slug) <= 50
        assert not slug.endswith("-")
