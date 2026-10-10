"""Views that do not belong to a feature app."""

from __future__ import annotations

from django.db import connection
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render


def home(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("safetyfiles:list")
    return render(request, "home.html")


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
