"""Read-only operational diagnosis; role writes go through the services."""

from django.contrib import admin

from app.organisations.models import Invitation, Membership, Organisation, OrganisationEvent


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register((Organisation, Membership, OrganisationEvent), ReadOnlyAdmin)


@admin.register(Invitation)
class InvitationAdmin(ReadOnlyAdmin):
    exclude = ("token_hash",)
    list_display = ("email", "organisation", "expires_at", "accepted_at", "revoked_at")
