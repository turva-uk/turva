"""Tests for safety file creation.

The property under test throughout is that the repository is the record and the
database is an index over it. Several of these assert things that only matter
when something has already gone wrong, which is when the distinction earns its
keep.
"""

from __future__ import annotations

import pytest
from django.conf import settings

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile, Visibility
from app.safetyfiles.services import (
    TO_BE_COMPLETED,
    SafetyFileDetails,
    allocate_slug,
    author_for,
    create_safety_file,
)

pytestmark = pytest.mark.django_db


DETAILS = SafetyFileDetails(
    name="BP@Home remote blood pressure monitoring",
    standard="DCB0160",
    organisation="Riverbank Health Federation",
    intended_use="Remote blood pressure monitoring for hypertension review.",
)


@pytest.fixture
def cso(db) -> User:
    user = User.objects.create_user(
        email="a.patel@riverbank.example.nhs.uk",
        password="correct-horse-battery-7",
        first_name="Anita",
        last_name="Patel",
    )
    user.is_verified = True
    user.save(update_fields=["is_verified"])
    return user


class TestCreation:
    def test_creates_a_repository_and_an_index_row(self, cso):
        safety_file = create_safety_file(DETAILS, cso)

        assert SafetyFile.objects.count() == 1
        assert safety_file.exists_on_disk
        assert safety_file.repository_path.is_dir()

    def test_repository_and_index_agree_on_identity(self, cso):
        """The manifest carries the row's UUID, so a rebuilt index reconnects."""
        safety_file = create_safety_file(DETAILS, cso)
        assert safety_file.repository().manifest.project_id == str(safety_file.id)

    def test_first_commit_is_attributed_to_the_creator(self, cso):
        safety_file = create_safety_file(DETAILS, cso)
        commit = safety_file.repository().history()[0]
        assert commit.author_name == "Anita Patel"
        assert commit.author_email == cso.email

    def test_the_repository_validates_and_is_clean(self, cso):
        repository = create_safety_file(DETAILS, cso).repository()
        assert repository.validate() == []
        assert repository.is_clean

    def test_a_new_safety_file_has_no_hazards(self, cso):
        """And the generated log says what that means."""
        repository = create_safety_file(DETAILS, cso).repository()
        assert repository.hazards() == []
        log = (repository.root / "docs" / "hazards" / "index.md").read_text()
        assert "not evidence of a safe system" in log

    def test_defaults_to_private(self, cso):
        """Publishing is a governance decision; an unreviewed draft is not it."""
        assert create_safety_file(DETAILS, cso).visibility == Visibility.PRIVATE

    def test_lives_in_a_directory_named_for_the_system(self, cso):
        """The repositories are browsable on the host, so the name matters."""
        safety_file = create_safety_file(DETAILS, cso)
        assert safety_file.slug == "bphome-remote-blood-pressure-monitoring"
        assert safety_file.repository_path.parent == settings.SAFETY_FILE_ROOT


class TestTemplateRendering:
    def test_the_creators_details_become_the_cso_details(self, cso):
        repository = create_safety_file(DETAILS, cso).repository()
        plan = (repository.root / "docs" / "clinical-risk-management-plan.md").read_text()
        assert "Anita Patel" in plan
        assert cso.email in plan

    def test_what_was_asked_for_appears_in_the_documents(self, cso):
        repository = create_safety_file(DETAILS, cso).repository()
        index = (repository.root / "docs" / "index.md").read_text()
        assert DETAILS.organisation in index
        assert DETAILS.intended_use in index

    def test_unanswered_sections_are_visibly_outstanding(self, cso):
        """Not quietly blank. A half-finished safety case should look it."""
        repository = create_safety_file(DETAILS, cso).repository()
        plan = (repository.root / "docs" / "clinical-risk-management-plan.md").read_text()
        assert TO_BE_COMPLETED in plan

    def test_no_placeholder_is_left_unrendered(self, cso):
        """A stray `{{ ... }}` would mean a template value went missing."""
        repository = create_safety_file(DETAILS, cso).repository()
        for path in (repository.root / "docs").rglob("*.md"):
            assert "{{" not in path.read_text(), f"unrendered placeholder in {path.name}"

    def test_the_sign_off_block_is_left_empty(self, cso):
        """An unsigned safety case should look unsigned."""
        repository = create_safety_file(DETAILS, cso).repository()
        report = (repository.root / "docs" / "clinical-safety-case-report.md").read_text()
        assert "Approval is a judgement made by a named, registered individual" in report


class TestSlugAllocation:
    def test_collisions_are_resolved(self, cso):
        first = create_safety_file(DETAILS, cso)
        second = create_safety_file(DETAILS, cso)
        assert first.slug != second.slug
        assert second.slug.endswith("-2")

    def test_an_orphan_directory_is_not_reused(self, cso):
        """A repository with no row is the state a failed creation leaves.

        Handing its directory to a new safety file would graft one file's
        history onto another, which is the identifier-reuse fault in a
        different costume.
        """
        orphan = settings.SAFETY_FILE_ROOT / "orphaned-system"
        (orphan / ".turva").mkdir(parents=True)
        assert allocate_slug("Orphaned system") == "orphaned-system-2"

    def test_an_unnameable_system_still_gets_a_directory(self):
        assert allocate_slug("???") == "safety-file"

    def test_long_names_are_truncated_without_a_trailing_hyphen(self):
        slug = allocate_slug("A " * 100)
        assert len(slug) <= 72
        assert not slug.endswith("-")


class TestAuthorIdentity:
    def test_uses_the_users_name_and_email(self, cso):
        author = author_for(cso)
        assert author.name == "Anita Patel"
        assert author.email == cso.email

    def test_falls_back_to_the_email_when_no_name_is_recorded(self, db):
        """A commit must always name someone. Never a service account - TH-004."""
        nameless = User.objects.create_user(
            email="nobody@riverbank.example.nhs.uk", password="x", first_name="", last_name=""
        )
        assert author_for(nameless).name == "nobody@riverbank.example.nhs.uk"


class TestFailureLeavesTheRecordIntact:
    def test_a_failed_index_write_does_not_remove_the_repository(self, cso, monkeypatch):
        """The repository is the record. Tidying it away after a database error
        would be destroying evidence to make the database look consistent."""
        from app.safetyfiles import models

        def explode(*args, **kwargs):
            raise RuntimeError("database went away")

        monkeypatch.setattr(models.SafetyFile, "save", explode)

        with pytest.raises(RuntimeError):
            create_safety_file(DETAILS, cso)

        assert SafetyFile.objects.count() == 0
        orphan = settings.SAFETY_FILE_ROOT / "bphome-remote-blood-pressure-monitoring"
        assert (orphan / ".turva" / "manifest.yaml").is_file(), (
            "the repository was removed after an indexing failure"
        )
