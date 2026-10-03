"""Admin registration for users.

The admin exists for support: inspecting an account, correcting a typo'd email,
or confirming why someone cannot sign in. It is one of the reasons for ADR 0001.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from app.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "organisation", "is_cso", "is_verified")
    list_filter = ("is_verified", "is_cso", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name", "organisation")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Name"), {"fields": ("first_name", "last_name")}),
        (_("Role"), {"fields": ("organisation", "job_role", "is_cso")}),
        (
            _("Email verification"),
            {
                "fields": ("is_verified", "verification_token", "verification_token_created_at"),
                "description": _(
                    "The token is shown for support purposes. Setting 'email verified' "
                    "by hand bypasses confirmation that the person controls the "
                    "address, so do it only with a recorded reason."
                ),
            },
        ),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups")}),
        (_("Dates"), {"fields": ("last_login", "date_joined", "updated_at")}),
    )
    readonly_fields = ("date_joined", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )
