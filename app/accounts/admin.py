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
    list_display = (
        "email",
        "first_name",
        "last_name",
        "organisation",
        "is_cso",
        "registration_verified",
        "is_verified",
    )
    list_filter = ("is_cso", "registration_verified", "is_verified", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name", "organisation", "registration_number")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Name"), {"fields": ("first_name", "last_name")}),
        (_("Role"), {"fields": ("organisation", "job_role")}),
        (
            _("Professional registration"),
            {
                "fields": (
                    "professional_regulator",
                    "registration_number",
                    "registration_verified",
                ),
                "description": _(
                    "Turva has no connection to the regulators' registers, so "
                    "<strong>this is the only place a registration can be marked as "
                    "checked</strong>. Tick it only after confirming the number on the "
                    "regulator's public register, and record who checked it and when. "
                    "A user cannot set this for themselves."
                ),
            },
        ),
        (
            _("Clinical Safety Officer"),
            {
                "fields": ("is_cso", "cso_declared_at"),
                "description": _(
                    "Self-declared by the user, with the date they declared it. The "
                    "role is an appointment the person's organisation makes; recording "
                    "it here does not confer it, and the generated safety case says "
                    "the details were not verified. See TH-009 in SAFETY.md."
                ),
            },
        ),
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
    # `cso_declared_at` is stamped by the model when the user declares the role.
    # Editing it here would falsify when a declaration was made.
    readonly_fields = ("date_joined", "updated_at", "last_login", "cso_declared_at")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )
