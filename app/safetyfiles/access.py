"""One evidence policy for services, API, interim views and download cache hits.

The organisation FK only narrows listing candidates. Named authority is read
from committed Git and intersected with current appointment/membership state.
"""

from __future__ import annotations

from contextlib import contextmanager

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.http import Http404

from app.accounts.models import User
from app.organisations.models import Membership, Organisation
from app.safetyfiles.models import SafetyFile, Visibility
from safety_file.errors import SafetyFileError, ValidationError


def current_actor(actor):
    if not actor.is_authenticated:
        return None
    return User.objects.filter(pk=actor.pk, is_active=True, is_verified=True).first()


def named_membership(team, actor):
    current = current_actor(actor)
    if current is None:
        return None
    person = next(
        (
            person
            for person in (team.accountable, *team.collaborators)
            if person.user_id == str(current.pk)
        ),
        None,
    )
    if person is None:
        return None
    member = (
        Membership.objects.select_related("user")
        .filter(
            pk=person.membership_id,
            organisation_id=team.organisation_id,
            user=current,
            active=True,
            cso_appointment=person.appointment_id,
        )
        .first()
    )
    return member if member and member.eligible_cso else None


def can_edit(safety_file, actor, repository):
    team = repository.team()
    if team is None:
        return bool(
            not safety_file.team_managed
            and current_actor(actor)
            and safety_file.owner_id == actor.pk
        )
    return named_membership(team, actor) is not None


def can_read(safety_file, actor, repository):
    return safety_file.visibility == Visibility.PUBLIC or can_edit(safety_file, actor, repository)


def can_manage_team(safety_file, actor, repository):
    team = repository.team()
    if team is None:
        return can_edit(safety_file, actor, repository)
    current = current_actor(actor)
    if current is None:
        return False
    if Membership.objects.filter(
        organisation_id=team.organisation_id, user=current, active=True, is_administrator=True
    ).exists():
        return True
    return (
        team.accountable.user_id == str(current.pk) and named_membership(team, current) is not None
    )


def visible_to(actor):
    """Bounded phase-one listing; never derive grants from organisation text.

    We deliberately read the small candidate set's committed teams rather than
    allowing a failed Git-before-index update to retain an obsolete DB grant.
    """
    current = current_actor(actor)
    if current is None:
        return SafetyFile.objects.filter(visibility=Visibility.PUBLIC)
    organisations = Membership.objects.filter(user=current, active=True).values("organisation_id")
    candidates = SafetyFile.objects.filter(
        Q(visibility=Visibility.PUBLIC)
        | Q(owner=current)
        | Q(organisation_unit_id__in=organisations)
    )
    allowed = []
    for safety_file in candidates:
        if safety_file.visibility == Visibility.PUBLIC:
            allowed.append(safety_file.pk)
            continue
        if not safety_file.team_managed and safety_file.owner_id == current.pk:
            if (
                not safety_file.exists_on_disk
                or safety_file.repository().manifest.schema_version == 1
            ):
                allowed.append(safety_file.pk)
                continue
        try:
            repository = safety_file.repository()
            with repository.snapshot():
                if can_read(safety_file, current, repository):
                    allowed.append(safety_file.pk)
        except SafetyFileError, OSError:
            # Unreadable teams cannot establish access. An operator must inspect
            # the repository, not fabricate an empty team or owner fallback.
            continue
    return SafetyFile.objects.filter(pk__in=allowed)


@contextmanager
def read_evidence(safety_file, actor):
    repository = safety_file.repository()
    with repository.snapshot():
        # Re-read permission under the same snapshot as the response, not only
        # in a candidate query before acquiring the repository lock.
        safety_file.refresh_from_db()
        if not can_read(safety_file, actor, repository):
            raise Http404
        yield repository


@contextmanager
def locked_file(safety_file, *, actor, adoption_organisation=None):
    """Write order: file row, organisation row, acting user row, repository edit.

    The row serialises adoption against saves that began under legacy rules.
    The org row serialises appointment revocation against all its file writes.
    Read the actual organisation from Git, not a possibly stale index binding.
    """
    with transaction.atomic():
        current = SafetyFile.objects.select_for_update().get(pk=safety_file.pk)
        repository = current.repository()
        with repository.snapshot():
            team = repository.team()
        organisation_id = team.organisation_id if team else adoption_organisation
        organisation = None
        if organisation_id:
            organisation = (
                Organisation.objects.select_for_update().filter(pk=organisation_id).first()
            )
            if organisation is None:
                raise PermissionDenied(
                    "This file's organisation is not provisioned in this deployment."
                )
        if actor.is_authenticated:
            # Profile withdrawal and account deactivation use SQL UPDATE, which
            # takes this same row lock. They cannot overtake an authorised save
            # between its fresh permission check and attributable Git commit.
            User.objects.select_for_update().get(pk=actor.pk)
        yield current, repository, organisation


@contextmanager
def edit_evidence(safety_file, actor, expected_head):
    if not isinstance(expected_head, str) or not expected_head:
        raise ValidationError("The version you opened is required before saving evidence.")
    with (
        locked_file(safety_file, actor=actor) as (current, repository, _),
        repository.edit(expected_head=expected_head),
    ):
        if not can_edit(current, actor, repository):
            raise PermissionDenied(
                "Only a verified legacy owner or a currently appointed, named file CSO may edit this evidence."
            )
        yield repository
