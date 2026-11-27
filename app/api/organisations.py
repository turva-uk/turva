"""Organisation administration has its own surface, never an evidence back door."""

from datetime import datetime

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response

from app.api.permissions import IsVerified, PrivateAPIView
from app.api.serializers import StrictWriteSerializer
from app.api.views import RepositoryView
from app.organisations.models import Invitation, Membership, Organisation
from app.organisations.services import (
    OrganisationConflict,
    accept_invitation,
    administrator,
    invite_member,
    revoke_invitation,
    update_membership,
)
from app.safetyfiles.access import can_manage_team, can_read
from app.safetyfiles.models import SafetyFile
from app.safetyfiles.teams import save_file_team
from safety_file.errors import SafetyFileError, ValidationError


def member_data(member):
    user = member.user
    return {
        "id": str(member.pk),
        "user_id": str(user.pk),
        "email": user.email,
        "name": user.get_full_name() or user.email,
        "active": member.active,
        "is_administrator": member.is_administrator,
        "is_cso": member.cso_appointment is not None,
        "eligible_cso": member.eligible_cso,
        "appointment_id": str(member.cso_appointment) if member.cso_appointment else None,
        "profile_declared": user.is_cso,
        "revision": member.revision,
    }


def invitation_data(invitation):
    return {
        "id": str(invitation.pk),
        "email": invitation.email,
        "created_at": invitation.created_at,
        "expires_at": invitation.expires_at,
        "accepted_at": invitation.accepted_at,
        "revoked_at": invitation.revoked_at,
    }


class OrganisationView(PrivateAPIView):
    permission_classes = [IsVerified]

    def handle_exception(self, exc):
        if isinstance(exc, OrganisationConflict):
            return Response({"detail": str(exc)}, status=409)
        if isinstance(exc, DjangoValidationError):
            return Response({"non_field_errors": exc.messages}, status=400)
        return super().handle_exception(exc)


class OrganisationListView(OrganisationView):
    def get(self, request):
        members = Membership.objects.filter(user=request.user, active=True).select_related(
            "organisation", "user"
        )
        return Response(
            [
                {
                    "id": str(member.organisation_id),
                    "name": member.organisation.name,
                    "membership": member_data(member),
                }
                for member in members
            ]
        )


def last_updated(safety_file) -> datetime | None:
    """When the file's Git history last changed, or `None` if it cannot be read.

    Only the time of the latest commit leaves here, never its subject or
    content: an administrator sees a file-title inventory, not its evidence
    (ADR 0006). The index row's own `updated_at` is not used, because saving
    evidence commits to Git without saving the row.
    """
    if not safety_file.exists_on_disk:
        return None

    try:
        latest = safety_file.repository().history(limit=1)
    except SafetyFileError:
        return None

    return latest[0].committed_at if latest else None


def file_data(organisation) -> list[dict[str, object]]:
    """The organisation's adopted files, the most recently updated first."""
    files = [
        {"slug": value.slug, "name": value.name, "last_updated": last_updated(value)}
        for value in organisation.safety_files.all()
    ]

    # Newest first; a file whose history cannot be read goes last, by name.
    return sorted(
        files,
        key=lambda value: (
            value["last_updated"] is None,
            -value["last_updated"].timestamp() if value["last_updated"] else 0,
            value["name"],
        ),
    )


def event_data(organisation, members) -> list[dict[str, object]]:
    """The organisation's latest administration events, with names to show.

    Each event's subject is stored as an email address. `subject_name` is the
    name of this organisation's member with that address, and `None` for
    anybody else, such as an invitation to someone who has not joined: an
    administrator learns no account holder's name by inviting them.
    """
    member_names = {value.user.email.lower(): value.user.get_full_name() for value in members}
    events = organisation.events.select_related("actor")[:100]

    return [
        {
            "action": event.action,
            "subject": event.subject,
            "subject_name": member_names.get(event.subject.lower()) or None,
            "detail": event.detail,
            "created_at": event.created_at,
            "actor__email": event.actor.email,
            "actor_name": event.actor.get_full_name() or None,
        }
        for event in events
    ]


class OrganisationDetailView(OrganisationView):
    def get(self, request, organisation_id):
        member = get_object_or_404(
            Membership.objects.select_related("organisation", "user"),
            organisation_id=organisation_id,
            user=request.user,
            active=True,
        )
        organisation = member.organisation
        members = Membership.objects.filter(organisation=organisation).select_related("user")
        payload = {
            "id": str(organisation.pk),
            "name": organisation.name,
            "membership": member_data(member),
            "members": [
                member_data(value) for value in members if member.is_administrator or value.active
            ],
        }
        if member.is_administrator:
            payload["invitations"] = [
                invitation_data(value) for value in organisation.invitations.all()[:100]
            ]
            payload["files"] = file_data(organisation)
            payload["events"] = event_data(organisation, members)
        return Response(payload)


class MembershipWriteSerializer(StrictWriteSerializer):
    expected_revision = serializers.IntegerField(min_value=0)
    active = serializers.BooleanField()
    is_administrator = serializers.BooleanField()
    is_cso = serializers.BooleanField()


class MembershipView(OrganisationView):
    def patch(self, request, organisation_id, member_id):
        organisation = get_object_or_404(Organisation, pk=organisation_id)
        administrator(organisation, request.user)
        get_object_or_404(Membership, pk=member_id, organisation=organisation)
        serializer = MembershipWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = update_membership(
            organisation, request.user, member_id, **serializer.validated_data
        )
        return Response(member_data(member))


class InvitationWriteSerializer(StrictWriteSerializer):
    email = serializers.EmailField()


class InvitationView(OrganisationView):
    def post(self, request, organisation_id):
        organisation = get_object_or_404(Organisation, pk=organisation_id)
        serializer = InvitationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation, sent = invite_member(organisation, request.user, **serializer.validated_data)
        return Response({"invitation": invitation_data(invitation), "email_sent": sent}, status=201)


class InvitationRevokeView(OrganisationView):
    def post(self, request, organisation_id, invitation_id):
        organisation = get_object_or_404(Organisation, pk=organisation_id)
        administrator(organisation, request.user)
        get_object_or_404(Invitation, pk=invitation_id, organisation=organisation)
        revoke_invitation(organisation, request.user, invitation_id)
        return Response({"detail": "Invitation revoked. No new membership can be created with it."})


class InvitationAcceptSerializer(StrictWriteSerializer):
    token = serializers.CharField(max_length=200, trim_whitespace=False)


class InvitationAcceptView(OrganisationView):
    def post(self, request, invitation_id):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = accept_invitation(invitation_id, request.user, **serializer.validated_data)
        return Response(
            {"organisation_id": str(member.organisation_id), "membership": member_data(member)}
        )


class TeamWriteSerializer(StrictWriteSerializer):
    expected_head = serializers.RegexField(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")
    organisation_id = serializers.UUIDField()
    accountable_id = serializers.UUIDField()
    collaborator_ids = serializers.ListField(child=serializers.UUIDField(), max_length=100)
    expected_appointments = serializers.DictField(child=serializers.UUIDField())
    reason = serializers.CharField(max_length=2000)


class FileTeamView(RepositoryView):
    def get(self, request, slug):
        safety_file = get_object_or_404(SafetyFile, slug=slug)
        repository = safety_file.repository()
        with repository.snapshot():
            may_manage = can_manage_team(safety_file, request.user, repository)
            if not may_manage and not can_read(safety_file, request.user, repository):
                raise Http404
            team = repository.team()
            choices = []
            if may_manage:
                organisations = Organisation.objects.filter(
                    memberships__user=request.user, memberships__active=True
                )
                if team:
                    organisations = organisations.filter(pk=team.organisation_id)
                for organisation in organisations:
                    members = Membership.objects.filter(
                        organisation=organisation, active=True
                    ).select_related("user")
                    csos = [member_data(member) for member in members if member.eligible_cso]
                    if team or any(value["user_id"] == str(request.user.pk) for value in csos):
                        choices.append(
                            {"id": str(organisation.pk), "name": organisation.name, "csos": csos}
                        )
            return Response(
                {
                    "file_name": safety_file.name,
                    "slug": safety_file.slug,
                    "team": team.to_dict() if team else None,
                    "head_sha": repository.head_sha,
                    "can_manage": may_manage,
                    "choices": choices,
                }
            )

    def put(self, request, slug):
        safety_file = get_object_or_404(SafetyFile, slug=slug)
        repository = safety_file.repository()
        with repository.snapshot():
            if not can_manage_team(safety_file, request.user, repository):
                if not can_read(safety_file, request.user, repository):
                    raise Http404
                raise PermissionDenied("You may read this file but cannot manage its team.")
        serializer = TeamWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            team, head = save_file_team(safety_file, request.user, **serializer.validated_data)
        except ValidationError as exc:
            return Response({"non_field_errors": [str(exc)]}, status=400)
        return Response({"team": team.to_dict(), "head_sha": head})
