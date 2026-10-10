"""The database index over safety file repositories.

**This model is an index, not the record.** The repository on disk is the system
of record; every row here is derivable from a repository's
`.turva/manifest.yaml`, and `manage.py reindex_safety_files` rebuilds the table
from disk to prove it. See `specifications/architecture-principles.md`.

So: nothing may live here that does not also live in the repository, with one
exception - `owner`, `visibility` and the timestamps are *operational* state
about who may see a thing in this deployment, not safety evidence. They are
Turva's, not the safety file's, and a repository handed to another organisation
should not carry this instance's user table with it.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

from safety_file import SafetyFileRepository

#: Mirrors `Manifest.standard` in the storage layer.
STANDARD_CHOICES = [
    ("DCB0160", _("DCB0160 - deploying a system")),
    ("DCB0129", _("DCB0129 - manufacturing a system")),
]


class Visibility(models.TextChoices):
    PUBLIC = "public", _("Public")
    PRIVATE = "private", _("Private")


class SafetyFile(models.Model):
    """One Clinical Safety Management File, indexed for listing and permissions."""

    #: Matches `project_id` in the repository's manifest. Allocated here and
    #: written into the manifest at creation, so a relocated or restored
    #: repository still knows which row it belongs to - and a rebuilt index
    #: reconnects to the same identifier rather than inventing a new one.
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    #: The directory name under SAFETY_FILE_ROOT, and the URL segment.
    #:
    #: Allocated once at creation and never changed, even if the name is
    #: corrected afterwards. Renaming the directory would break any path a
    #: person has bookmarked, cloned or written into a backup script, and the
    #: name is not the identity - the UUID is.
    slug = models.SlugField(max_length=80, unique=True, editable=False)

    name = models.CharField(_("system name"), max_length=200)
    standard = models.CharField(max_length=10, choices=STANDARD_CHOICES, default="DCB0160")
    organisation = models.CharField(_("organisation"), max_length=200)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="safety_files",
        help_text=_(
            "Accountable for this safety file. PROTECT rather than CASCADE: "
            "deleting a user must never delete safety evidence."
        ),
    )

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
        help_text=_(
            "Transparency is the long-term goal, but visibility defaults to "
            "private because publishing is a governance decision and the safe "
            "default for an unreviewed draft is not to publish it."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("safety file")
        verbose_name_plural = _("safety files")

    def __str__(self) -> str:
        return self.name

    def get_absolute_url(self) -> str:
        return reverse("safetyfiles:detail", kwargs={"slug": self.slug})

    @property
    def repository_path(self) -> Path:
        """Where this safety file lives on disk.

        Derived rather than stored. A stored path would be a second source of
        truth that could disagree with reality after a move, and would need
        rewriting if the deployment's storage root ever changed.
        """
        return Path(settings.SAFETY_FILE_ROOT) / self.slug

    @property
    def exists_on_disk(self) -> bool:
        return (self.repository_path / ".turva" / "manifest.yaml").is_file()

    def repository(self) -> SafetyFileRepository:
        """Open the underlying repository.

        A method rather than a cached property: it touches the filesystem and
        validates the schema version, and hiding that behind attribute access
        would make an expensive, failure-prone call look free.
        """
        return SafetyFileRepository(self.repository_path)
