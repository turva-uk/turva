"""Listing, creating and viewing safety files."""

from __future__ import annotations

import logging

from django.contrib import messages
from django.db.models import QuerySet
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render

from app.accounts.decorators import verified_required
from app.safetyfiles.forms import SafetyFileForm
from app.safetyfiles.models import SafetyFile, Visibility
from app.safetyfiles.services import SafetyFileDetails, create_safety_file
from safety_file.errors import SafetyFileError

logger = logging.getLogger(__name__)


def visible_to(user) -> QuerySet[SafetyFile]:
    """Safety files this user may see.

    Phase one's permission model in one function: you see your own, and you see
    anything published. Team membership and the customer hand-off both land
    here when they are built, which is the reason this is a single named
    queryset rather than a filter repeated in each view - a permission rule
    expressed in three places is a permission rule that will eventually
    disagree with itself.
    """
    if not user.is_authenticated:
        return SafetyFile.objects.filter(visibility=Visibility.PUBLIC)
    return SafetyFile.objects.filter(owner=user) | SafetyFile.objects.filter(
        visibility=Visibility.PUBLIC
    )


@verified_required
def safety_file_list(request: HttpRequest) -> HttpResponse:
    """The signed-in user's safety files."""
    safety_files = visible_to(request.user).select_related("owner")
    return render(
        request,
        "safetyfiles/list.html",
        {
            "safety_files": safety_files,
            "owned_count": safety_files.filter(owner=request.user).count(),
        },
    )


@verified_required
def safety_file_create(request: HttpRequest) -> HttpResponse:
    """Create a safety file: a Git repository plus its index row."""
    if request.method == "POST":
        form = SafetyFileForm(request.POST)
        if form.is_valid():
            details = SafetyFileDetails(
                name=form.cleaned_data["name"],
                standard=form.cleaned_data["standard"],
                organisation=form.cleaned_data["organisation"],
                intended_use=form.cleaned_data["intended_use"],
            )
            try:
                safety_file = create_safety_file(details, request.user)
            except SafetyFileError, OSError:
                # Covers a template that will not render, an unwritable storage
                # root, and a git failure. Logged with a traceback; the user
                # gets something they can act on rather than a 500.
                logger.exception("Could not create safety file %r", details.name)
                messages.error(
                    request,
                    "Turva could not create the safety file. Nothing was saved. "
                    "This has been logged - please try again, and tell an "
                    "administrator if it keeps happening.",
                )
            else:
                messages.success(
                    request,
                    f"Created {safety_file.name}. Its first commit records you as the author.",
                )
                return redirect(safety_file)
    else:
        form = SafetyFileForm()

    return render(request, "safetyfiles/create.html", {"form": form})


@verified_required
def safety_file_detail(request: HttpRequest, slug: str) -> HttpResponse:
    """One safety file, read from its repository rather than from the index.

    The counts and history shown here come from the Git repository, not from
    the database. That is deliberate and worth the extra filesystem work: it
    means the page cannot show a stale or invented figure, and if the index and
    the repository ever disagree, the page tells the truth.
    """
    safety_file = get_object_or_404(visible_to(request.user), slug=slug)

    context: dict[str, object] = {"safety_file": safety_file}

    if not safety_file.exists_on_disk:
        # The index knows about a repository that is not there. Surfaced rather
        # than 500-ing, because the likely causes - a restore that missed the
        # volume, a half-failed creation - need a human, and the message should
        # say which.
        context["repository_missing"] = True
        return render(request, "safetyfiles/detail.html", context, status=200)

    repository = safety_file.repository()
    hazards = repository.hazards()
    context |= {
        "hazards": hazards,
        "mitigations": repository.mitigations(),
        "blocking": [h for h in hazards if h.status == "open" and h.requires_elimination],
        "history": repository.history(limit=10),
        "problems": repository.validate(),
        "head_sha": repository.head_sha,
    }
    return render(request, "safetyfiles/detail.html", context)
