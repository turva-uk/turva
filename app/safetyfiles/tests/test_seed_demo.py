"""Tests for `seed_demo`.

The demo is what the project gets shown with, so the thing most worth testing is
that running the command leaves you able to sign in and see the safety file -
and that it will not do any of that on a machine where DEBUG is off.
"""

from __future__ import annotations

from io import StringIO
from pathlib import Path

import pytest
import yaml
from django.conf import settings as django_settings
from django.core.management import CommandError, call_command

from app.accounts.models import Regulator, User
from app.safetyfiles.management.commands.seed_demo import _split_registration
from app.safetyfiles.models import SafetyFile
from safety_file import Author, SafetyFileRepository

pytestmark = pytest.mark.django_db

CSO_EMAIL = "a.patel@riverbank.example.nhs.uk"
DEFINITION = Path(django_settings.BASE_DIR) / "demo" / "riverbank-bp-at-home.yaml"


@pytest.fixture
def debug(settings):
    """pytest-django forces DEBUG off, which is the state the command refuses in."""
    settings.DEBUG = True
    return settings


@pytest.fixture
def demo_repository(settings) -> Path:
    """A demo safety file on disk with no index row, as `demo/build.py` leaves it.

    Only the scaffold, not the hazards: what is being tested here is the wiring
    to an account and an index row, and `demo/build.py` already covers the rest
    end to end.
    """
    definition = yaml.safe_load(DEFINITION.read_text(encoding="utf-8"))
    target = Path(settings.SAFETY_FILE_ROOT) / "demo-bp-at-home"
    SafetyFileRepository.create(
        target,
        name=definition["name"],
        standard=definition["standard"],
        template_dir=(
            Path(django_settings.BASE_DIR) / "safety-file-templates" / definition["template"]
        ),
        values=definition["values"],
        author=Author(name="Dr Anita Patel", email=CSO_EMAIL),
        created=definition["created"],
    )
    return target


def seed(**kwargs) -> str:
    out = StringIO()
    call_command("seed_demo", stdout=out, **kwargs)
    return out.getvalue()


class TestRefusingToRun:
    def test_refuses_with_debug_off(self, demo_repository):
        """The account's password is published in this repository.

        No fixture sets DEBUG here, so this is the default state of the suite -
        and of anything that is not a development machine.
        """
        with pytest.raises(CommandError, match="DEBUG"):
            seed()
        assert not User.objects.filter(email__iexact=CSO_EMAIL).exists()

    def test_refuses_when_the_demo_has_not_been_built(self, debug):
        with pytest.raises(CommandError, match="No demo safety file"):
            seed()

    def test_a_refused_run_leaves_no_account_behind(self, debug):
        """The check comes before the write, not after it.

        It did not at first: the account was created and then the command failed
        on the missing repository, leaving an orphan to explain.
        """
        with pytest.raises(CommandError):
            seed()
        assert User.objects.count() == 0


class TestTheAccount:
    def test_is_the_cso_named_in_the_demo_definition(self, debug, demo_repository):
        seed()
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert user.organisation == "Riverbank Health Federation"
        assert user.job_role == "Clinical Safety Officer"

    def test_carries_the_name_the_demo_commits_are_attributed_to(self, debug, demo_repository):
        """Otherwise the history shows one name and the header another."""
        seed()
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert user.get_full_name() == "Dr Anita Patel"

    def test_can_sign_in(self, debug, demo_repository, client):
        seed()
        assert client.login(username=CSO_EMAIL, password="turva-demo-local")

    def test_the_password_can_be_set(self, debug, demo_repository, client):
        seed(password="something-else-entirely")
        assert client.login(username=CSO_EMAIL, password="something-else-entirely")

    def test_is_verified_so_the_demo_does_not_open_on_a_confirmation_notice(
        self, debug, demo_repository
    ):
        seed()
        assert User.objects.get(email__iexact=CSO_EMAIL).is_verified

    def test_has_the_registration_from_the_definition(self, debug, demo_repository):
        seed()
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert user.professional_regulator == Regulator.GMC
        assert user.registration_number == "7654321"
        assert user.professional_registration == "GMC 7654321"

    def test_the_registration_is_not_marked_verified(self, debug, demo_repository):
        """Nobody checked it against a register, and the demo should show that.

        An unverified registration is the state nearly every real one will be
        in, so it is also the more honest thing to demonstrate. See TH-009.
        """
        seed()
        assert not User.objects.get(email__iexact=CSO_EMAIL).registration_verified

    def test_declares_the_cso_role_with_a_date(self, debug, demo_repository):
        seed()
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert user.is_cso
        assert user.cso_declared_at is not None

    def test_is_not_staff_by_default(self, debug, demo_repository):
        """The admin is the only route to `registration_verified`.

        A known-password account should not reach it without being asked for.
        """
        seed()
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert not user.is_staff
        assert not user.is_superuser

    def test_staff_can_be_requested(self, debug, demo_repository):
        seed(staff=True)
        user = User.objects.get(email__iexact=CSO_EMAIL)
        assert user.is_staff
        assert user.is_superuser


class TestTheIndex:
    def test_the_demo_appears_in_the_index_owned_by_the_account(self, debug, demo_repository):
        seed()
        row = SafetyFile.objects.get(slug="demo-bp-at-home")
        assert row.owner.email == CSO_EMAIL
        assert row.name == "BP@Home remote blood pressure monitoring"
        assert row.standard == "DCB0160"

    def test_the_row_points_at_the_repository_on_disk(self, debug, demo_repository):
        seed()
        assert SafetyFile.objects.get(slug="demo-bp-at-home").exists_on_disk

    def test_the_demo_is_reachable_through_the_interface(self, debug, demo_repository, client):
        """The point of the command: a demo you can click through."""
        seed()
        client.login(username=CSO_EMAIL, password="turva-demo-local")
        response = client.get("/safety-files/")
        assert b"BP@Home remote blood pressure monitoring" in response.content


class TestRunningItAgain:
    def test_does_not_duplicate_the_account_or_the_row(self, debug, demo_repository):
        seed()
        seed()
        assert User.objects.filter(email__iexact=CSO_EMAIL).count() == 1
        assert SafetyFile.objects.filter(slug="demo-bp-at-home").count() == 1

    def test_does_not_move_the_declaration_date(self, debug, demo_repository):
        """Re-seeding is a convenience, not a new assertion by the person."""
        seed()
        declared = User.objects.get(email__iexact=CSO_EMAIL).cso_declared_at
        seed()
        assert User.objects.get(email__iexact=CSO_EMAIL).cso_declared_at == declared


class TestSplittingTheRegistration:
    def test_splits_a_known_regulator(self):
        assert _split_registration("GMC 7654321") == ("GMC", "7654321")

    def test_is_case_insensitive(self):
        assert _split_registration("gmc 7654321") == ("GMC", "7654321")

    @pytest.mark.parametrize("value", ["", "7654321", "SomethingElse 123"])
    def test_records_nothing_when_the_regulator_is_not_recognised(self, value):
        """A number with no regulator beside it names nothing."""
        assert _split_registration(value) == ("", "")
