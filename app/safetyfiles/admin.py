"""Admin registration for the safety file index.

Read-mostly on purpose. The admin is a support tool for answering "why can this
person not see their safety file?", not a second way to edit safety evidence -
anything written here would bypass the storage layer, and so would not be
committed, attributed, or validated.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from app.safetyfiles.models import SafetyFile


@admin.register(SafetyFile)
class SafetyFileAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "standard", "organisation", "owner", "visibility")
    list_filter = ("standard", "visibility")
    search_fields = ("name", "slug", "organisation", "owner__email")
    ordering = ("name",)

    # Identity and content are the repository's. Only the deployment state that
    # genuinely lives here - who owns it, who may see it - is editable.
    readonly_fields = ("id", "slug", "name", "standard", "organisation", "created_at", "updated_at")
    fieldsets = (
        (
            _("From the repository"),
            {
                "fields": ("id", "slug", "name", "standard", "organisation"),
                "description": _(
                    "Read from the safety file's manifest and rebuildable with "
                    "<code>manage.py reindex_safety_files</code>. Editing these here "
                    "would make the index disagree with the record."
                ),
            },
        ),
        (_("Deployment state"), {"fields": ("owner", "visibility")}),
        (_("Dates"), {"fields": ("created_at", "updated_at")}),
    )

    def has_add_permission(self, request) -> bool:
        """Creating a row without a repository would index something that does
        not exist. Safety files are created through the application."""
        return False
