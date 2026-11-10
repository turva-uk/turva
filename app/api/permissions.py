"""Permission classes for the API.

`verified_required` is the template layer's equivalent; this is the same rule
expressed where DRF can enforce it.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsVerified(BasePermission):
    """Require a signed-in user who has confirmed their email address.

    Confirmation is what makes an attribution meaningful. A commit recording
    that `a.patel@trust.nhs.uk` accepted a residual risk is only evidence if
    someone demonstrated control of that address, so this gates everything that
    can write to a safety file.

    403 rather than the template layer's redirect: an API client cannot be sent
    to a notice page, and the message says what to do instead.
    """

    message = "Confirm your email address before creating or editing safety files."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_verified)
