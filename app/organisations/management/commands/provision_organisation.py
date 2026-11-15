"""Explicit operator bootstrap. Free-text organisation names confer no rights."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.management.base import BaseCommand, CommandError

from app.accounts.models import User
from app.organisations.services import provision_organisation


class Command(BaseCommand):
    help = "Provision a separate organisation with one verified administrator (no CSO appointment)."

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True)
        parser.add_argument(
            "--administrator", required=True, help="An existing, verified account's email address."
        )

    def handle(self, *args, **options):
        try:
            user = User.objects.get(email__iexact=options["administrator"])
            organisation = provision_organisation(options["name"], user)
        except (User.DoesNotExist, PermissionDenied, ValidationError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            f"Provisioned {organisation.name}: {organisation.pk}. No safety-file access or CSO role was granted."
        )
