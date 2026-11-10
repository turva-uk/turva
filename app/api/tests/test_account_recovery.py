"""Account recovery/confirmation boundaries, including anonymous CSRF (TH-005)."""

from __future__ import annotations

from datetime import timedelta

import pytest
import time_machine
from django.contrib.auth.tokens import default_token_generator
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from app.accounts.models import VERIFICATION_TOKEN_COOLDOWN, VERIFICATION_TOKEN_LIFETIME, User

pytestmark = pytest.mark.django_db
PASSWORD = "correct-horse-battery-7"
NEW_PASSWORD = "fictional-password-for-recovery-82"


@pytest.fixture
def person():
    return User.objects.create_user(
        email="s.whitlock@riverbank.example.nhs.uk",
        password=PASSWORD,
        first_name="Sarah",
        last_name="Whitlock",
    )


def post(client, name, body=None):
    return client.post(reverse(f"v1:{name}"), body or {}, content_type="application/json")


def reset_data(person):
    return {
        "uid": urlsafe_base64_encode(force_bytes(person.pk)),
        "token": default_token_generator.make_token(person),
        "new_password1": NEW_PASSWORD,
        "new_password2": NEW_PASSWORD,
    }


class TestAnonymousCSRF:
    @pytest.mark.parametrize(
        "name", ["verify", "verify-resend", "password-reset", "password-reset-confirm"]
    )
    def test_unsafe_requests_without_csrf_are_refused(self, name):
        strict = Client(enforce_csrf_checks=True)
        response = post(strict, name)
        assert response.status_code == 403
        assert response["Content-Type"].startswith("application/json")

    def test_reset_request_with_a_csrf_cookie_succeeds(self, mailoutbox):
        strict = Client(enforce_csrf_checks=True)
        strict.get(reverse("v1:session"))
        response = strict.post(
            reverse("v1:password-reset"),
            {"email": "unknown@example.org"},
            content_type="application/json",
            headers={"X-CSRFToken": strict.cookies["csrftoken"].value},
        )
        assert response.status_code == 202
        assert not mailoutbox


class TestVerification:
    def test_following_a_link_requires_an_explicit_post_and_does_not_log_in(self, client, person):
        token = person.issue_verification_token()
        assert client.get(reverse("v1:verify")).status_code == 405
        assert (
            post(client, "verify", {"user_id": str(person.pk), "token": token}).status_code == 200
        )
        person.refresh_from_db()
        assert person.is_verified is True
        assert person.verification_token == ""
        assert person.verification_last_sent_at is None
        assert "_auth_user_id" not in client.session

    @pytest.mark.parametrize("kind", ["wrong", "expired", "inactive"])
    def test_invalid_confirmation_cannot_grant_access(self, client, person, kind):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            token = person.issue_verification_token()
            if kind == "expired":
                traveller.shift(VERIFICATION_TOKEN_LIFETIME + timedelta(seconds=1))
            if kind == "wrong":
                token = "wrong-token"
            if kind == "inactive":
                person.is_active = False
                person.save()
            assert (
                post(client, "verify", {"user_id": str(person.pk), "token": token}).status_code
                == 400
            )
        person.refresh_from_db()
        assert person.is_verified is False

    def test_confirmation_does_not_switch_a_different_signed_in_account(self, client, person):
        other = User.objects.create_user(
            email="other@example.org", password=PASSWORD, first_name="Other", last_name="Person"
        )
        client.force_login(other)
        token = person.issue_verification_token()
        assert (
            post(client, "verify", {"user_id": str(person.pk), "token": token}).status_code == 200
        )
        assert client.session["_auth_user_id"] == str(other.pk)

    def test_resend_requires_sign_in(self, client):
        assert post(client, "verify-resend").status_code == 403

    def test_resend_enforces_every_cooldown_and_reuses_the_link(self, client, person, mailoutbox):
        client.force_login(person)
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            assert post(client, "verify-resend").status_code == 200
            assert post(client, "verify-resend").status_code == 429
            traveller.shift(VERIFICATION_TOKEN_COOLDOWN + timedelta(seconds=1))
            assert post(client, "verify-resend").status_code == 200
            assert post(client, "verify-resend").status_code == 429
        assert len(mailoutbox) == 2
        assert mailoutbox[0].body == mailoutbox[1].body

    def test_mail_failure_is_reported_without_losing_the_account(self, client, person, monkeypatch):
        from app.accounts import services

        def fail(*args, **kwargs):
            raise OSError("test delivery failure")

        monkeypatch.setattr(services, "send_verification_email", fail)
        client.force_login(person)
        assert post(client, "verify-resend").status_code == 503
        assert User.objects.filter(pk=person.pk).exists()


class TestPasswordReset:
    def test_known_unknown_and_inactive_addresses_have_the_same_response(
        self, client, person, mailoutbox, settings
    ):
        settings.SITE_BASE_URL = "https://turva.example.org"
        known = post(client, "password-reset", {"email": person.email})
        unknown = post(client, "password-reset", {"email": "nobody@example.org"})
        person.is_active = False
        person.save()
        inactive = post(client, "password-reset", {"email": person.email})
        assert known.status_code == unknown.status_code == inactive.status_code == 202
        assert known.json() == unknown.json() == inactive.json()
        assert len(mailoutbox) == 1
        assert "https://turva.example.org/accounts/password-reset/" in mailoutbox[0].body
        assert "testserver" not in mailoutbox[0].body

    def test_can_reset_once_and_old_sessions_stop_working(self, client, person):
        client.force_login(person)
        data = reset_data(person)
        assert post(client, "password-reset-confirm", data).status_code == 200
        person.refresh_from_db()
        assert person.check_password(NEW_PASSWORD)
        assert not person.check_password(PASSWORD)
        assert post(client, "password-reset-confirm", data).status_code == 400
        assert client.get(reverse("v1:session")).json()["authenticated"] is False

    @pytest.mark.parametrize("kind", ["bad_uid", "bad_token", "expired", "inactive"])
    def test_invalid_reset_does_not_change_the_password(self, client, person, kind, settings):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            data = reset_data(person)
            if kind == "bad_uid":
                data["uid"] = "not-an-encoded-uuid"
            if kind == "bad_token":
                data["token"] = "wrong"
            if kind == "expired":
                traveller.shift(timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT + 1))
            if kind == "inactive":
                person.is_active = False
                person.save()
            assert post(client, "password-reset-confirm", data).status_code == 400
        person.refresh_from_db()
        assert person.check_password(PASSWORD)

    def test_mismatch_and_weak_password_leave_the_link_usable(self, client, person):
        data = reset_data(person)
        assert (
            post(
                client, "password-reset-confirm", {**data, "new_password2": "does-not-match"}
            ).status_code
            == 400
        )
        assert (
            post(
                client,
                "password-reset-confirm",
                {**data, "new_password1": "short", "new_password2": "short"},
            ).status_code
            == 400
        )
        assert post(client, "password-reset-confirm", data).status_code == 200


def test_registration_validates_password_similarity_against_the_proposed_user(client):
    response = post(
        client,
        "register",
        {
            "email": "verylongsurname@example.org",
            "first_name": "A",
            "last_name": "Verylongsurname",
            "password": "Verylongsurname",
        },
    )
    assert response.status_code == 400
    assert "password" in response.json()
    assert not User.objects.filter(email="verylongsurname@example.org").exists()


def test_password_whitespace_round_trips_through_registration_and_login(client):
    password = f"  {PASSWORD}  "
    payload = {
        "email": "test@example.org",
        "first_name": "Test",
        "last_name": "Person",
        "password": password,
    }
    assert post(client, "register", payload).status_code == 201
    post(client, "logout")
    assert (
        post(client, "login", {"email": payload["email"], "password": password}).status_code == 200
    )


def test_registration_mail_failure_keeps_a_recoverable_account(client, monkeypatch):
    from app.accounts import services

    def fail(*args, **kwargs):
        raise OSError("test delivery failure")

    monkeypatch.setattr(services, "send_verification_email", fail)
    response = post(
        client,
        "register",
        {
            "email": "delivery-failure@example.org",
            "first_name": "Test",
            "last_name": "Person",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201
    assert response.json()["confirmation_email_sent"] is False
    assert response.json()["user"]["is_verified"] is False
    assert client.session.get("_auth_user_id")
    assert post(client, "verify-resend").status_code == 429
