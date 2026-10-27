"""Make the built demo safety file usable: an account to sign in as, and an index row.

`demo/build.py` produces a Git repository on disk and nothing else - it imports
no framework, which is what lets it double as an end-to-end test of the storage
layer. The result is a safety file you cannot reach through the interface:
nobody owns it, no row points at it, and there is no account to sign in as.

This command closes that gap. It creates the demo's Clinical Safety Officer as a
real account, with the identity the demo's commits are already attributed to, and
then adopts the repository into the index under that account.

It refuses to run outside DEBUG. The account it creates has a password that is
written down in the repository's own documentation, and it owns a safety file.
That is exactly right for a laptop and indefensible anywhere else.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.accounts.models import Regulator, User

DEFINITION = Path("demo") / "riverbank-bp-at-home.yaml"
DEMO_SLUG = "demo-bp-at-home"

# Overridable, because a password in a repository is a password everyone has.
# Local-only and guarded by DEBUG, but there is no reason to make someone keep
# the published one.
DEFAULT_PASSWORD = "turva-demo-local"


class Command(BaseCommand):
    help = "Create the demo account and index the demo safety file. Development only."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--password",
            default=os.environ.get("TURVA_DEMO_PASSWORD", DEFAULT_PASSWORD),
            help=(
                "Password for the demo account. Defaults to TURVA_DEMO_PASSWORD, "
                f"or {DEFAULT_PASSWORD!r} if that is unset."
            ),
        )
        parser.add_argument(
            "--staff",
            action="store_true",
            help=(
                "Also grant admin access. Off by default: the admin is the only "
                "place a professional registration can be marked as verified, so "
                "a known-password account should not reach it without asking."
            ),
        )

    def handle(self, *args, **options) -> None:
        if not settings.DEBUG:
            raise CommandError(
                "seed_demo refuses to run with DEBUG off. It creates an account "
                "whose password is published in this repository and gives it "
                "ownership of a safety file. That is a development convenience, "
                "not something to run against a real deployment."
            )

        definition = self._definition()
        values = definition["values"]
        cso = definition["authors"]["cso"]

        # Checked before anything is written, so a run that cannot finish does
        # not leave an account behind for a safety file that is not there.
        repository = Path(settings.SAFETY_FILE_ROOT) / DEMO_SLUG
        if not repository.is_dir():
            raise CommandError(
                f"No demo safety file at {repository}. Build it first with ./s/seed-demo, "
                "or run `python demo/build.py` directly."
            )

        user, created = self._account(
            email=cso["email"],
            full_name=cso["name"],
            organisation=values.get("organisation", ""),
            registration=values.get("cso_registration", ""),
            password=options["password"],
            staff=options["staff"],
        )

        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} {user.email}"))

        # Reuse the adoption path rather than reimplementing it. It reads the
        # project id from the manifest, so running this twice updates the row
        # that is already there instead of creating a second one - and anything
        # else on disk without an index row gets adopted at the same time, which
        # on a development machine is what you want.
        call_command("reindex_safety_files", owner=user.email, verbosity=options["verbosity"])

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Sign in at /accounts/login/ with:"))
        self.stdout.write(f"  {user.email}")
        self.stdout.write(f"  {options['password']}")

    def _definition(self) -> dict[str, Any]:
        path = Path(settings.BASE_DIR) / DEFINITION
        if not path.is_file():
            raise CommandError(f"Demo definition not found at {path}")
        return yaml.safe_load(path.read_text(encoding="utf-8"))

    @transaction.atomic
    def _account(
        self,
        *,
        email: str,
        full_name: str,
        organisation: str,
        registration: str,
        password: str,
        staff: bool,
    ) -> tuple[User, bool]:
        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if user is None:
            user = User(email=email)

        # Split on the last space, so "Dr Anita Patel" rebuilds through
        # `get_full_name()` exactly as the demo's commits record it. A title in
        # the first name field reads oddly, but a demo whose subject is the
        # audit trail should not show one name in the history and another in
        # the header.
        first, _, last = full_name.rpartition(" ")
        user.first_name = first or full_name
        user.last_name = last if first else ""

        user.organisation = organisation
        user.job_role = "Clinical Safety Officer"

        regulator, number = _split_registration(registration)
        user.professional_regulator = regulator
        user.registration_number = number
        # Left false deliberately. Nobody has checked this against a register,
        # and the demo should show what an unverified registration looks like -
        # that is the state nearly every real one will be in. See TH-009.
        user.registration_verified = False

        # Skips the confirmation email: there is no mailbox to receive it, and a
        # demo that opens on "confirm your email address" demonstrates nothing.
        user.is_verified = True
        user.is_staff = staff
        user.is_superuser = staff

        user.declare_cso(declared=True, was_declared=False if created else user.is_cso)
        user.set_password(password)
        user.save()
        return user, created


def _split_registration(registration: str) -> tuple[str, str]:
    """Split "GMC 7654321" into a known regulator and a number.

    An unrecognised regulator yields no registration at all rather than a
    half-recorded one: a number with no regulator beside it names nothing.
    """
    regulator, _, number = registration.strip().partition(" ")
    if regulator.upper() not in Regulator.values:
        return "", ""
    return regulator.upper(), number.strip()
