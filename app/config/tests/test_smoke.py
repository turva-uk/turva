"""Whole-application checks that do not belong to a feature app."""

from __future__ import annotations

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


class TestPublicPages:
    def test_home_page_renders_for_an_anonymous_visitor(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert b"clinical safety" in response.content.lower()

    def test_home_page_states_what_turva_is_not(self, client):
        """The disclaimer is a safety control, not marketing copy.

        TH-002 and the SAFETY.md non-goals depend on users not believing this is
        clinical decision support.
        """
        body = client.get("/").content.decode()
        assert "does not make clinical decisions" in body
        assert "does not replace a Clinical Safety Officer" in body


class TestHealthCheck:
    def test_reports_ok_when_the_database_is_reachable(self, client):
        response = client.get(reverse("healthz"))
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "database": "ok"}

    def test_reports_unhealthy_when_the_database_is_not(self, client, monkeypatch):
        """503, not 200 with a cheerful message.

        A health check that stays green while the database is unreachable is
        worse than none: it stops a deployment from rolling back.
        """
        from app.config import views

        class BrokenConnection:
            def cursor(self):
                raise RuntimeError("connection pool exhausted")

        monkeypatch.setattr(views, "connection", BrokenConnection())
        response = client.get(reverse("healthz"))
        assert response.status_code == 503
        assert response.json()["status"] == "unhealthy"


class TestSecurityHeadersAndCookies:
    def test_csrf_protection_is_active_on_registration(self, client):
        """Posting without the token must fail.

        `enforce_csrf_checks` is off in the normal test client, so this uses a
        client that keeps it on.
        """
        from django.test import Client

        strict = Client(enforce_csrf_checks=True)
        response = strict.post(
            reverse("accounts:register"),
            {"email": "x@riverbank.example.nhs.uk", "password1": "x", "password2": "x"},
        )
        assert response.status_code == 403

    def test_clickjacking_protection_is_applied(self, client):
        response = client.get("/")
        assert response.headers.get("X-Frame-Options") in {"DENY", "SAMEORIGIN"}


class TestAdmin:
    def test_admin_is_reachable_and_requires_sign_in(self, client):
        """The admin is a support tool, so it must exist and must be gated."""
        response = client.get("/admin/")
        assert response.status_code == 302
        assert "/admin/login/" in response["Location"]

    def test_staff_user_reaches_the_admin(self, client, django_user_model):
        admin = django_user_model.objects.create_superuser(
            email="admin@riverbank.example.nhs.uk",
            password="correct-horse-battery-7",
            first_name="Ad",
            last_name="Min",
        )
        client.force_login(admin)
        assert client.get("/admin/").status_code == 200


class TestTemplatesDoNotLeakComments:
    """`{# ... #}` is single-line only in Django.

    A multi-line one renders as visible text on the page. That happened: the
    note explaining the `role="status"` choice on the messages region appeared
    above every flash message, because Prettier had wrapped it. Nothing in the
    suite noticed, because no test read the page as a person would.
    """

    def test_no_template_source_uses_a_multiline_hash_comment(self):
        import re
        from pathlib import Path

        from django.conf import settings

        offenders = []
        for path in sorted(Path(settings.BASE_DIR, "app", "templates").rglob("*.html")):
            text = path.read_text(encoding="utf-8")
            for match in re.finditer(r"\{#", text):
                end = text.find("#}", match.start())
                if end == -1 or "\n" in text[match.start() : end]:
                    line = text[: match.start()].count("\n") + 1
                    offenders.append(f"{path.name}:{line}")

        assert not offenders, (
            "multi-line {# #} comments render as visible text; use "
            f"{{% comment %}} instead: {', '.join(offenders)}"
        )

    def test_no_rendered_page_contains_template_comment_syntax(self, client, django_user_model):
        user = django_user_model.objects.create_user(
            email="reader@riverbank.example.nhs.uk",
            password="correct-horse-battery-7",
            first_name="Read",
            last_name="Er",
        )
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        client.force_login(user)

        for url in ("/", "/accounts/register/", "/accounts/login/", "/safety-files/"):
            body = client.get(url).content.decode()
            assert "{#" not in body and "#}" not in body, f"template comment leaked on {url}"
            assert "{%" not in body and "%}" not in body, f"unrendered tag on {url}"
