"""Deployment membership, appointments and invitation state, not safety evidence."""

import uuid

from django.conf import settings
from django.db import models


class Organisation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class Membership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="memberships"
    )
    active = models.BooleanField(default=True)
    is_administrator = models.BooleanField(default=False)
    # A new UUID on every appointment. Revocation/rejoining must not revive an
    # old named grant in Git. A renewed profile declaration needs reappointment.
    cso_appointment = models.UUIDField(null=True, blank=True, editable=False)
    cso_declaration = models.DateTimeField(null=True, blank=True, editable=False)
    revision = models.PositiveIntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "user"], name="unique_organisation_member"
            )
        ]
        ordering = ["user__email"]

    @property
    def eligible_cso(self):
        user = self.user
        return bool(
            self.active
            and self.cso_appointment
            and user.is_active
            and user.is_verified
            and user.is_cso
            and user.has_professional_registration
            and user.cso_declared_at
            and user.cso_declared_at == self.cso_declaration
        )


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name="invitations"
    )
    email = models.EmailField()
    issuer = models.ForeignKey(Membership, on_delete=models.PROTECT)
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class OrganisationEvent(models.Model):
    """Append-only through the service API; an operator can still alter the DB."""

    organisation = models.ForeignKey(Organisation, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=60)
    subject = models.CharField(max_length=254)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
