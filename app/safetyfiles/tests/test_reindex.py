"""Tests for `reindex_safety_files`.

`architecture-principles.md` says the database "must be rebuildable from the
repositories". Until there was a command that did it, and a test that ran it,
that was an assertion rather than a property. These tests are the evidence.
"""

from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile
from app.safetyfiles.services import SafetyFileDetails, create_safety_file

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


def reindex(**kwargs) -> str:
    out = StringIO()
    call_command("reindex_safety_files", stdout=out, **kwargs)
    return out.getvalue()


class TestRebuildingTheIndex:
    def test_the_whole_index_can_be_rebuilt_from_disk_alone(self, cso):
        """The architectural claim, tested: delete every row and recover it.

        This is what would happen after losing the database and restoring only
        the repositories, which is the backup strategy the architecture implies.
        """
        original = create_safety_file(DETAILS, cso)
        original_id, original_name = original.id, original.name

        SafetyFile.objects.all().delete()
        assert SafetyFile.objects.count() == 0

        reindex(owner=cso.email)

        recovered = SafetyFile.objects.get()
        assert recovered.id == original_id, "identity must survive, not be reinvented"
        assert recovered.name == original_name
        assert recovered.standard == "DCB0160"
        assert recovered.organisation == "Riverbank Health Federation"
        assert recovered.exists_on_disk

    def test_recovers_a_repository_orphaned_by_a_failed_index_write(self, cso, monkeypatch):
        """The exact state `create_safety_file` leaves when the database fails."""
        from app.safetyfiles import models

        monkeypatch.setattr(
            models.SafetyFile, "save", lambda *a, **k: (_ for _ in ()).throw(RuntimeError())
        )
        with pytest.raises(RuntimeError):
            create_safety_file(DETAILS, cso)
        monkeypatch.undo()

        assert SafetyFile.objects.count() == 0
        output = reindex(owner=cso.email)

        assert "Adopted" in output
        assert SafetyFile.objects.get().name == DETAILS.name

    def test_a_rebuilt_row_is_usable_immediately(self, client, cso):
        """Not just present in the table - the page has to render from it."""
        safety_file = create_safety_file(DETAILS, cso)
        url = safety_file.get_absolute_url()
        SafetyFile.objects.all().delete()
        reindex(owner=cso.email)

        client.force_login(cso)
        assert client.get(url).status_code == 200


class TestSafety:
    def test_dry_run_writes_nothing(self, cso):
        create_safety_file(DETAILS, cso)
        SafetyFile.objects.all().delete()

        output = reindex(owner=cso.email, dry_run=True)

        assert "Would adopt" in output
        assert "nothing was written" in output
        assert SafetyFile.objects.count() == 0

    def test_without_an_owner_it_refuses_to_guess(self, cso):
        """Ownership is deployment state and is not in the repository.

        Inventing it would silently hand someone else's safety file to whoever
        happened to run the command.
        """
        create_safety_file(DETAILS, cso)
        SafetyFile.objects.all().delete()

        output = reindex()

        assert "Skipped" in output
        assert SafetyFile.objects.count() == 0

    def test_an_unknown_owner_is_an_error_not_a_silent_skip(self, cso):
        with pytest.raises(CommandError, match="No user with email"):
            reindex(owner="nobody@riverbank.example.nhs.uk")

    def test_a_row_whose_repository_is_missing_is_reported_not_deleted(self, cso):
        """Deleting the row would destroy the evidence that the file existed."""
        import shutil

        safety_file = create_safety_file(DETAILS, cso)
        shutil.rmtree(safety_file.repository_path)

        output = reindex(owner=cso.email)

        assert "Indexed but not on disk" in output
        assert "restore it rather than deleting the row" in output.replace("\n", " ")
        assert SafetyFile.objects.filter(pk=safety_file.pk).exists()

    def test_a_directory_that_is_not_a_safety_file_is_skipped(self, cso, settings):
        """Someone will put something else in that directory eventually."""
        (settings.SAFETY_FILE_ROOT / "not-a-safety-file").mkdir()
        output = reindex(owner=cso.email)
        assert "Skipped not-a-safety-file" in output

    def test_a_renamed_system_updates_the_index(self, cso):
        """The manifest is authoritative; the row follows it."""
        safety_file = create_safety_file(DETAILS, cso)
        SafetyFile.objects.filter(pk=safety_file.pk).update(name="Stale name")

        output = reindex(owner=cso.email)

        assert "Updated" in output
        safety_file.refresh_from_db()
        assert safety_file.name == DETAILS.name
