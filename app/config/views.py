"""Views that do not belong to a feature app."""

from __future__ import annotations

from django.db import connection
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render


def home(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("safetyfiles:list")
    return render(request, "home.html")


def csrf_failure(request: HttpRequest, reason: str = "") -> HttpResponse:
    """Render a CSRF failure in the format the caller is using.

    Django's default failure view returns an HTML page. That is right for the
    server-rendered screens and wrong for the API, where a client calling
    `.json()` on the response gets a parse error instead of the actual problem -
    which turns a one-line fix, a missing `X-CSRFToken`, into a confusing
    debugging session.

    `request.path` rather than content negotiation: the `Accept` header is
    whatever the client happened to send, while the path is what was actually
    being called.
    """
    if request.path.startswith("/api/"):
        return JsonResponse(
            {
                "detail": "CSRF verification failed. Send the X-CSRFToken header.",
                "reason": reason,
            },
            status=403,
        )
    return render(request, "403_csrf.html", {"reason": reason}, status=403)


def healthz(request: HttpRequest) -> JsonResponse:
    """Liveness and readiness check.

    Touches the database, because an application that cannot reach PostgreSQL
    cannot serve anything useful and should not be reported as healthy. Returns
    503 rather than raising so a load balancer sees a definite answer.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # noqa: BLE001 - any failure means not ready
        return JsonResponse({"status": "unhealthy", "database": "unreachable"}, status=503)
    return JsonResponse({"status": "ok", "database": "ok"})
