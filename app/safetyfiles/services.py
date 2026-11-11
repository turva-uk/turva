"""Creating safety files: the bridge between Django and the storage layer.

The ordering here is the whole point, so it is worth stating: **the repository
is created first, and the index row second.** The repository is the system of
record. If the database write fails afterwards, the evidence still exists on
disk and `reindex_safety_files` recovers it. Doing it the other way round would
allow a row describing a safety file that was never written.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone
from django.utils.text import slugify

from app.accounts.models import User
from app.safetyfiles.models import SafetyFile, Visibility
from safety_file import Author, SafetyFileRepository
from safety_file.errors import ValidationError
from safety_file.models import Assessment, Hazard

logger = logging.getLogger(__name__)

#: Written into template fields the creating user has not supplied. Deliberately
#: conspicuous: a safety case with unanswered sections should read as unfinished
#: rather than quietly plausible. The same reasoning as leaving the sign-off
#: block of a new safety case report blank.
TO_BE_COMPLETED = "*To be completed.*"

#: Slug length cap, leaving room for the numeric suffix a collision adds.
MAX_SLUG_LENGTH = 72


def visible_to(user) -> QuerySet[SafetyFile]:
    """Safety files this user may see.

    Phase one's permission model in one function: you see your own, and you see
    anything published. Team membership and delegated hazard mitigation both
    land here when they are built, which is the reason this is a single named
    queryset rather than a filter repeated in each view - a permission rule
    expressed in three places is a permission rule that will eventually
    disagree with itself.

    It lives here rather than beside the template views because it now has two
    callers: those views and the API. That is the same argument the paragraph
    above makes, applied one level up.
    """
    if not user.is_authenticated:
        return SafetyFile.objects.filter(visibility=Visibility.PUBLIC)
    return SafetyFile.objects.filter(owner=user) | SafetyFile.objects.filter(
        visibility=Visibility.PUBLIC
    )


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
        # From the creator's profile when they have recorded one. Turva has not
        # checked it against the regulator's register, and the generated
        # documents say so - see the note in the clinical risk management plan
        # template. A safety file that printed an unverified registration as
        # though it were confirmed would be making a claim on someone's behalf
        # that nobody had checked (TH-009 in SAFETY.md).
        "cso_registration": owner.professional_registration or TO_BE_COMPLETED,
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
    # Reserve the directory atomically. Two requests can choose the same slug
    # between a filesystem check and Git init; only one may claim that path.
    settings.SAFETY_FILE_ROOT.mkdir(parents=True, exist_ok=True)
    while True:
        slug = allocate_slug(details.name)
        try:
            (settings.SAFETY_FILE_ROOT / slug).mkdir()
            break
        except FileExistsError:
            continue
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


def save_hazard(
    safety_file: SafetyFile,
    actor: User,
    values: dict,
    *,
    expected_head: str,
    hazard_id: str | None = None,
) -> tuple[Hazard, str]:
    """One deliberate, owner-only form save to the repository, never a DB row.

    Identifier allocation, stale-version check, validation, generated log and
    attributable commit are inside one shared repository lock. Existing links,
    identifiers and creation dates cannot be changed by this operation.
    """
    if (
        not actor.is_authenticated
        or not actor.is_active
        or not actor.is_verified
        or safety_file.owner_id != actor.pk
    ):
        raise PermissionDenied("Only the safety file's verified owner may edit its hazards.")
    allowed = {
        "title",
        "status",
        "owner",
        "cause",
        "effect",
        "harm",
        "justification",
        "body",
        "initial",
        "residual",
    }
    if set(values) - allowed:
        raise ValidationError(
            "Identifiers, dates, mitigation links and derived risk cannot be set by this save."
        )
    if not isinstance(expected_head, str) or not expected_head:
        raise ValidationError("The version you opened is required before saving a hazard.")
    repository = safety_file.repository()
    with repository.edit(expected_head=expected_head):
        data = dict(values)
        for field in ("initial", "residual"):
            if field in data:
                if not isinstance(data[field], dict) or set(data[field]) != {
                    "severity",
                    "likelihood",
                }:
                    raise ValidationError(f"{field} must contain only severity and likelihood.")
                data[field] = Assessment.from_dict(data[field], field)
        if hazard_id is None:
            hazard = Hazard(
                id=repository.next_hazard_id(),
                created=timezone.localdate(),
                updated=timezone.localdate(),
                **data,
            )
        else:
            current = repository.hazard(hazard_id)
            hazard = replace(current, **data)
            if hazard != current:
                hazard.updated = timezone.localdate()
        repository.save_hazard(
            hazard,
            author_for(actor),
            message=f"feat({hazard.id}): {'record' if hazard_id is None else 'update'} hazard - {hazard.title}",
        )
        return repository.hazard(hazard.id), repository.head_sha


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
