"""View decorators for account state.

`login_required` answers "is this someone?". These answer "is this someone we
can attribute a safety decision to?", which is a different question and the one
that matters before anything is written to a repository.
"""

from __future__ import annotations

from collections.abc import Callable
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect


def verified_required(view: Callable[..., HttpResponse]) -> Callable[..., HttpResponse]:
    """Require a signed-in user who has confirmed their email address.

    Confirmation is what makes an attribution meaningful: a commit recording
    that `a.patel@trust.nhs.uk` accepted a residual risk is only evidence if
    someone demonstrated control of that address. Applied to every view that can
    write to a safety file.

    Redirects rather than returning 403, because the user can fix this and the
    notice page tells them how.
    """

    @wraps(view)
    @login_required
    def wrapper(request: HttpRequest, *args: object, **kwargs: object) -> HttpResponse:
        if not request.user.is_verified:
            return redirect("accounts:verify_notice")
        return view(request, *args, **kwargs)

    return wrapper
