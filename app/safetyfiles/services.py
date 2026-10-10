"""Creating safety files: the bridge between Django and the storage layer.

The ordering here is the whole point, so it is worth stating: **the repository
is created first, and the index row second.** The repository is the system of
record. If the database write fails afterwards, the evidence still exists on
disk and `reindex_safety_files` recovers it. Doing it the other way round would
allow a row describing a safety file that was never written.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils.text import slugify

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile
from safety_file import Author, SafetyFileRepository

logger = logging.getLogger(__name__)

#: Written into template fields the creating user has not supplied. Deliberately
#: conspicuous: a safety case with unanswered sections should read as unfinished
#: rather than quietly plausible. The same reasoning as leaving the sign-off
#: block of a new safety case report blank.
TO_BE_COMPLETED = "*To be completed.*"

#: Slug length cap, leaving room for the numeric suffix a collision adds.
MAX_SLUG_LENGTH = 72


@dataclass(frozen=True)
class SafetyFileDetails:
    """What the creating user supplies. Everything else is derived or deferred."""

    name: str
    standard: str
    organisation: str
    intended_use: str


def allocate_slug(name: str) -> str:
    """A unique, filesystem-safe directory name for a new safety file.

    Checked against both the database *and* the filesystem. The filesystem check
    is not redundant: a repository can exist without a row, which is exactly the
    state left behind if an earlier creation failed between the two writes, and
    reusing that directory would graft a new safety file onto another's history.
    """
    base = slugify(name)[:MAX_SLUG_LENGTH].strip("-") or "safety-file"
    root = settings.SAFETY_FILE_ROOT

    candidate = base
    suffix = 1
    while SafetyFile.objects.filter(slug=candidate).exists() or (root / candidate).exists():
        suffix += 1
        candidate = f"{base}-{suffix}"
    return candidate


def author_for(user: User) -> Author:
    """The Git identity a user's changes are committed under.

    Falls back to the email address when no name is recorded, because a commit
    must always name someone. It must never fall back to a service account -
    see TH-004 in SAFETY.md.
    """
    return Author(name=user.get_full_name() or user.email, email=user.email)


def template_values(details: SafetyFileDetails, owner: User) -> dict[str, str]:
    """Fill the template's placeholders.

    The creating user answers four questions. Their own name and email become
    the Clinical Safety Officer details, because the person setting up a safety
    file is almost always the CSO - and where that is wrong it is visible in the
    rendered document and editable afterwards.

    Everything else is marked as outstanding rather than invented. Phase one's
    workflow is shell project, then AI-assisted discovery, then the customer
    fills the gaps, so unanswered fields are the expected state of a new file.
    """
    return {
        "organisation": details.organisation,
        "intended_use": details.intended_use,
        "cso_name": owner.get_full_name() or owner.email,
        "cso_email": owner.email,
        "cso_registration": TO_BE_COMPLETED,
        "clinical_context": TO_BE_COMPLETED,
        "risk_acceptability_criteria": TO_BE_COMPLETED,
        "governance": TO_BE_COMPLETED,
        "residual_risk_statement": TO_BE_COMPLETED,
    }


def create_safety_file(details: SafetyFileDetails, owner: User) -> SafetyFile:
    """Scaffold a repository and index it.

    Returns the index row. Raises whatever the storage layer raises if the
    repository cannot be written - there is nothing useful to do with a failure
    here except show it, since no safety file was created.
    """
    slug = allocate_slug(details.name)
    safety_file = SafetyFile(
        slug=slug,
        name=details.name,
        standard=details.standard,
        organisation=details.organisation,
        owner=owner,
    )

    template_dir = settings.SAFETY_FILE_TEMPLATE_ROOT / _template_for(details.standard)

    # The repository first. Its manifest carries the UUID allocated above, so
    # the row and the repository agree on identity from the moment both exist.
    SafetyFileRepository.create(
        safety_file.repository_path,
        name=details.name,
        standard=details.standard,
        template_dir=template_dir,
        values=template_values(details, owner),
        author=author_for(owner),
        project_id=str(safety_file.id),
    )

    try:
        with transaction.atomic():
            safety_file.save()
    except Exception:
        # Deliberately not deleting the repository. It is the system of record,
        # it is valid, and `reindex_safety_files` will adopt it. Removing
        # evidence to tidy up after a database error is the wrong instinct.
        logger.exception(
            "Indexing failed for safety file %s at %s. The repository exists and "
            "is intact; run `manage.py reindex_safety_files` to adopt it.",
            safety_file.id,
            safety_file.repository_path,
        )
        raise

    return safety_file


def _template_for(standard: str) -> str:
    """Map a standard onto its template directory.

    Only DCB0160 has a template so far. DCB0129 falls back to it rather than
    failing, because the two share most of their structure and a deployment
    template is a closer starting point than nothing - but the difference is
    real, so this is tracked in the roadmap rather than left to look deliberate.
    """
    return {
        "DCB0160": "dcb0160-deployment",
        "DCB0129": "dcb0160-deployment",
    }[standard]
