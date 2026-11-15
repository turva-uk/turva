"""Named file-team decisions use Git, with live organisation authorisation."""

from django.core.exceptions import PermissionDenied

from app.organisations.models import Membership
from app.safetyfiles.access import can_manage_team, current_actor, locked_file
from app.safetyfiles.services import author_for
from safety_file.errors import StaleVersionError, ValidationError
from safety_file.team import FileTeam, TeamPerson


def identity_for(member):
    return TeamPerson(
        user_id=str(member.user_id),
        membership_id=str(member.pk),
        appointment_id=str(member.cso_appointment),
        name=member.user.get_full_name() or member.user.email,
        email=member.user.email,
    )


def save_file_team(
    safety_file,
    actor,
    *,
    organisation_id,
    accountable_id,
    collaborator_ids,
    expected_appointments,
    reason,
    expected_head,
):
    if not isinstance(expected_head, str) or not expected_head:
        raise ValidationError("The version you opened is required before saving a team.")
    with (
        locked_file(safety_file, actor=actor, adoption_organisation=organisation_id) as (
            current,
            repository,
            organisation,
        ),
        repository.edit(expected_head=expected_head),
    ):
        if not can_manage_team(current, actor, repository):
            raise PermissionDenied(
                "Only the legacy owner, accountable CSO or organisation administrator may manage this file's team."
            )
        previous = repository.team()
        if organisation is None or str(organisation.pk) != str(organisation_id):
            raise ValidationError(
                "A file cannot be transferred between organisations through team editing."
            )
        identifiers = [str(accountable_id), *(str(value) for value in collaborator_ids)]
        if len(identifiers) != len(set(identifiers)):
            raise ValidationError("Name each person only once, with exactly one accountable CSO.")
        members = {
            str(member.pk): member
            for member in Membership.objects.filter(
                organisation=organisation, pk__in=identifiers, active=True
            ).select_related("user")
        }
        if set(members) != set(identifiers) or not all(
            member.eligible_cso for member in members.values()
        ):
            raise ValidationError(
                "Every file CSO must have a current appointment in this organisation. Reload the team choices after any role change."
            )
        if set(expected_appointments) != set(identifiers) or any(
            str(expected_appointments[value]) != str(members[value].cso_appointment)
            for value in identifiers
        ):
            raise StaleVersionError(
                "A selected CSO appointment changed after this form opened. Nothing was saved. Keep your draft and reload the choices before a new team decision."
            )
        if previous is None and members[str(accountable_id)].user_id != current_actor(actor).pk:
            raise ValidationError(
                "Adoption must name the legacy owner as the first accountable CSO. Transfer accountability in a later explicit team save."
            )
        team = FileTeam(
            organisation_id=str(organisation.pk),
            organisation_name=organisation.name,
            accountable=identity_for(members[str(accountable_id)]),
            collaborators=tuple(identity_for(members[value]) for value in sorted(identifiers[1:])),
            reason=reason,
        )
        repository.save_team(team, author_for(actor))
        # Git first. If indexing fails, Git's team still controls all reads and
        # writes; an old legacy owner never bypasses the new recorded team.
        current.team_managed = True
        current.organisation_unit = organisation
        current.organisation = team.organisation_name
        current.save(
            update_fields=["team_managed", "organisation_unit", "organisation", "updated_at"]
        )
        return team, repository.head_sha
