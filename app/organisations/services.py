"""Conservative organisation provisioning and verified-email membership flows.

All organisation changes and evidence writes lock the organisation row before
the Git lock. Never lock these in the opposite order (ADR 0006).
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone

from app.accounts.models import User
from app.organisations.models import Invitation, Membership, Organisation, OrganisationEvent


class OrganisationConflict(Exception):
    """A stale membership form or invitation cooldown; no changes were applied."""


def verified_actor(actor, *, lock=False):
    if not actor.is_authenticated:
        raise PermissionDenied("A verified, active account is required.")
    users = User.objects.select_for_update() if lock else User.objects.all()
    current = users.get(pk=actor.pk)
    if not current.is_active or not current.is_verified:
        raise PermissionDenied("A verified, active account is required.")
    return current


def administrator(organisation, actor, *, lock=False):
    actor = verified_actor(actor, lock=lock)
    member = Membership.objects.filter(
        organisation=organisation, user=actor, active=True, is_administrator=True
    ).first()
    if member is None:
        raise PermissionDenied("Only an administrator of this organisation may manage it.")
    return member


def record_event(organisation, actor, action, subject, **detail):
    OrganisationEvent.objects.create(
        organisation=organisation, actor=actor, action=action, subject=str(subject), detail=detail
    )


def provision_organisation(name: str, initial_administrator: User):
    """Operator-only bootstrap; never exposed as a self-service HTTP action."""
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
        raise ValidationError("Give the organisation a name of at most 200 characters.")
    with transaction.atomic():
        actor = verified_actor(initial_administrator, lock=True)
        organisation = Organisation.objects.create(name=name.strip())
        Membership.objects.create(organisation=organisation, user=actor, is_administrator=True)
        record_event(
            organisation, actor, "organisation.provisioned", actor.email, name=organisation.name
        )
    return organisation


def update_membership(
    organisation,
    actor,
    member_id,
    *,
    expected_revision: int,
    active: bool,
    is_administrator: bool,
    is_cso: bool,
):
    with transaction.atomic():
        organisation = Organisation.objects.select_for_update().get(pk=organisation.pk)
        administrator(organisation, actor, lock=True)
        member = Membership.objects.select_related("user").get(
            pk=member_id, organisation=organisation
        )
        if type(expected_revision) is not int or member.revision != expected_revision:
            raise OrganisationConflict(
                "This membership changed after you opened it. Reload before making a new decision."
            )
        if not all(type(value) is bool for value in (active, is_administrator, is_cso)):
            raise ValidationError("Membership roles must be explicit booleans.")
        if not active and (is_administrator or is_cso):
            raise ValidationError("A removed member cannot hold organisation roles.")
        if not member.active and active:
            raise ValidationError(
                "Invite a removed member again; roles cannot reactivate membership."
            )
        if member.is_administrator and (not active or not is_administrator):
            remaining = Membership.objects.filter(
                organisation=organisation,
                active=True,
                is_administrator=True,
                user__is_active=True,
                user__is_verified=True,
            ).exclude(pk=member.pk)
            if not remaining.exists():
                raise ValidationError(
                    "Appoint another active administrator before removing the last one."
                )
            Invitation.objects.filter(
                issuer=member, accepted_at__isnull=True, revoked_at__isnull=True
            ).update(revoked_at=timezone.now())
        if is_cso:
            user = member.user
            if not (
                user.is_active
                and user.is_verified
                and user.is_cso
                and user.cso_declared_at
                and user.has_professional_registration
            ):
                raise ValidationError(
                    "A CSO must first confirm their email and complete their CSO profile declaration. Appointment does not verify competence or registration."
                )
            if not member.eligible_cso:
                member.cso_appointment = uuid.uuid4()
                member.cso_declaration = user.cso_declared_at
        else:
            member.cso_appointment = None
            member.cso_declaration = None
        member.active = active
        member.is_administrator = is_administrator
        member.revision += 1
        member.save()
        record_event(
            organisation,
            actor,
            "membership.changed",
            member.user.email,
            active=active,
            is_administrator=is_administrator,
            appointment=str(member.cso_appointment) if member.cso_appointment else None,
        )
        return member


def invite_member(organisation, actor, email: str):
    """Issue a one-use token; retain an attempt even if mail delivery fails."""
    email = email.strip().lower()
    validate_email(email)
    with transaction.atomic():
        organisation = Organisation.objects.select_for_update().get(pk=organisation.pk)
        issuer = administrator(organisation, actor, lock=True)
        if Membership.objects.filter(
            organisation=organisation, user__email__iexact=email, active=True
        ).exists():
            raise ValidationError("That address is already an active member of this organisation.")
        recent = Invitation.objects.filter(
            organisation=organisation,
            email=email,
            created_at__gt=timezone.now() - timedelta(minutes=10),
        )
        if recent.exists():
            raise OrganisationConflict(
                "An invitation was attempted recently. Wait ten minutes before inviting this address again."
            )
        Invitation.objects.filter(
            organisation=organisation,
            email=email,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
        ).update(revoked_at=timezone.now())
        token = secrets.token_urlsafe(32)
        invitation = Invitation.objects.create(
            organisation=organisation,
            email=email,
            issuer=issuer,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(days=7),
        )
        record_event(organisation, actor, "invitation.issued", email)
    origin = urlsplit(settings.FRONTEND_BASE_URL)
    if origin.scheme not in {"http", "https"} or not origin.netloc:
        raise ValidationError("FRONTEND_BASE_URL must be an absolute HTTP(S) URL.")
    # Fragment tokens stay out of request paths, proxy logs and Referer headers.
    link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/organisations/invitations/{invitation.pk}#{token}"
    try:
        send_mail(
            "Invitation to join an organisation in Turva",
            f"You have been invited to join {organisation.name}.\n\nSign in with the verified email address {email}, then accept this invitation:\n{link}\n\nThis invitation expires in seven days and grants membership only, not access to safety files or a CSO appointment.",
            settings.DEFAULT_FROM_EMAIL,
            [email],
        )
    except OSError:
        return invitation, False
    return invitation, True


INVALID_INVITATION = "This invitation is invalid, expired or no longer available."


def _invitation_usable(invitation: Invitation, token: object) -> bool:
    """Whether an invitation's link still works.

    It must be unaccepted, unrevoked and unexpired, the token must match, and
    whoever sent it must still be an active, verified administrator. Shared by the preview and by acceptance, so a page never names the
    organisation of an invitation that could not be accepted.
    """
    issuer = invitation.issuer

    return not (
        invitation.accepted_at
        or invitation.revoked_at
        or invitation.expires_at <= timezone.now()
        or not isinstance(token, str)
        or not secrets.compare_digest(
            invitation.token_hash, hashlib.sha256(token.encode()).hexdigest()
        )
        or not (
            issuer.active
            and issuer.is_administrator
            and issuer.user.is_active
            and issuer.user.is_verified
        )
    )


def preview_invitation(invitation_id: uuid.UUID, token: str) -> dict[str, object]:
    """Say what an invitation is for, so it is never accepted blind.

    Read only, and open to a signed-out visitor: whoever holds the token
    already has the email that names the organisation, so this tells them
    nothing new. Without the right token, or once the invitation is spent,
    the answer is the same as acceptance gives, so an invitation's id alone
    reveals no organisation.
    """
    invitation = (
        Invitation.objects.select_related("organisation", "issuer__user")
        .filter(pk=invitation_id)
        .first()
    )
    if invitation is None or not _invitation_usable(invitation, token):
        raise ValidationError(INVALID_INVITATION)

    inviter = invitation.issuer.user

    return {
        "organisation_name": invitation.organisation.name,
        "inviter_name": inviter.get_full_name() or inviter.email,
        "email": invitation.email,
        "expires_at": invitation.expires_at,
    }


def accept_invitation(invitation_id, actor, token: str):
    verified_actor(actor)
    # Discover only the row to lock, then re-read everything under that lock.
    invitation = Invitation.objects.filter(pk=invitation_id).first()
    if invitation is None:
        raise ValidationError(INVALID_INVITATION)
    with transaction.atomic():
        organisation = Organisation.objects.select_for_update().get(pk=invitation.organisation_id)
        current = verified_actor(actor, lock=True)
        invitation.refresh_from_db()
        if invitation.email != current.email.lower() or not _invitation_usable(invitation, token):
            raise ValidationError(
                "This invitation is invalid, expired or no longer available for this verified account."
            )
        member, _ = Membership.objects.get_or_create(organisation=organisation, user=current)
        if not member.active:
            member.active = True
            member.is_administrator = False
            member.cso_appointment = None
            member.cso_declaration = None
            member.revision += 1
            member.save()
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        record_event(organisation, current, "invitation.accepted", current.email)
        return member


def revoke_invitation(organisation, actor, invitation_id):
    with transaction.atomic():
        organisation = Organisation.objects.select_for_update().get(pk=organisation.pk)
        administrator(organisation, actor, lock=True)
        invitation = Invitation.objects.get(pk=invitation_id, organisation=organisation)
        if not invitation.accepted_at and not invitation.revoked_at:
            invitation.revoked_at = timezone.now()
            invitation.save(update_fields=["revoked_at"])
            record_event(organisation, actor, "invitation.revoked", invitation.email)
