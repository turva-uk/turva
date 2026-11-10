"""Tests for the authentication endpoints.

The CSRF tests here are the ones worth reading. DRF leaves a hole that an
obvious test suite passes straight over: `APIView.as_view()` is `csrf_exempt`,
so Django's middleware never runs, and DRF re-enforces CSRF inside
`SessionAuthentication` - which returns early for an anonymous request and so
never reaches `enforce_csrf`. Authenticated writes are protected; login,
registration and logout were not, until `csrf_protect` was applied to them.

That was found by probing a running server, not by reading the code. These
tests exist so it cannot come back quietly.
"""

from __future__ import annotations

import pytest
from django.urls import reverse

from app.accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"


@pytest.fixture
def user(db) -> User:
    person = User.objects.create_user(
        email="a.patel@riverbank.example.nhs.uk",
        password=PASSWORD,
        first_name="Anita",
        last_name="Patel",
    )
    person.is_verified = True
    person.save(update_fields=["is_verified"])
    return person


class TestSession:
    def test_an_anonymous_caller_is_told_so_rather_than_refused(self, client):
        """The SPA calls this on boot to choose between interface and login.

        A 401 would make "you are not signed in" look like an error, which is
        the one thing the client is specifically asking about.
        """
        response = client.get(reverse("v1:session"))
        assert response.status_code == 200
        assert response.json() == {"authenticated": False, "user": None}

    def test_it_sets_the_csrf_cookie(self, client):
        """Otherwise the first unsafe request has no token to send, and the
        chicken-and-egg surfaces as an unexplained 403 on first use."""
        response = client.get(reverse("v1:session"))
        assert "csrftoken" in response.cookies

    def test_a_signed_in_caller_gets_their_details(self, client, user):
        client.force_login(user)
        body = client.get(reverse("v1:session")).json()
        assert body["authenticated"] is True
        assert body["user"]["email"] == user.email
        assert body["user"]["full_name"] == "Anita Patel"


class TestLogin:
    def test_valid_credentials_establish_a_session(self, client, user):
        response = client.post(
            reverse("v1:login"),
            {"email": user.email, "password": PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["authenticated"] is True
        assert client.session.get("_auth_user_id") == str(user.pk)

    def test_a_wrong_password_is_rejected(self, client, user):
        response = client.post(
            reverse("v1:login"),
            {"email": user.email, "password": "not-the-password"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "_auth_user_id" not in client.session

    def test_an_unknown_address_gives_the_same_message_as_a_wrong_password(self, client, user):
        """Distinguishing them tells an attacker which addresses are registered."""

        def message(payload):
            return client.post(
                reverse("v1:login"), payload, content_type="application/json"
            ).json()["detail"]

        unknown = message({"email": "nobody@riverbank.example.nhs.uk", "password": "x"})
        wrong = message({"email": user.email, "password": "definitely-wrong"})
        assert unknown == wrong

    def test_an_unverified_user_may_still_sign_in(self, client, db):
        """Verification gates writing to a safety file, not signing in.

        Someone who has not confirmed their address still needs to reach the
        notice that tells them to, and their own profile.
        """
        unverified = User.objects.create_user(
            email="s.whitlock@riverbank.example.nhs.uk",
            password=PASSWORD,
            first_name="Sarah",
            last_name="Whitlock",
        )
        response = client.post(
            reverse("v1:login"),
            {"email": unverified.email, "password": PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["user"]["is_verified"] is False


class TestCSRFOnAnonymousEndpoints:
    """The gap DRF leaves open, pinned shut.

    `enforce_csrf_checks=True` makes the test client behave like a browser.
    Without it the default client exempts itself and every one of these passes
    whether or not the protection exists - which is exactly how this would have
    been missed.
    """

    @pytest.fixture
    def strict(self, client_class=None):
        from django.test import Client

        return Client(enforce_csrf_checks=True)

    def test_login_without_a_token_is_refused(self, strict, user):
        """Login CSRF is a real attack, not a formality.

        An attacker makes a victim's browser sign in as *the attacker*; the
        victim then enters hazard assessments into an account the attacker
        controls, and the audit trail faithfully records the attacker as the
        author. That reaches TH-004 and TH-005.
        """
        response = strict.post(
            reverse("v1:login"),
            {"email": user.email, "password": PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 403
        assert "_auth_user_id" not in strict.session

    def test_registration_without_a_token_is_refused(self, strict, db):
        response = strict.post(
            reverse("v1:register"),
            {
                "email": "new@riverbank.example.nhs.uk",
                "first_name": "New",
                "last_name": "Person",
                "password": PASSWORD,
            },
            content_type="application/json",
        )
        assert response.status_code == 403
        assert not User.objects.filter(email="new@riverbank.example.nhs.uk").exists()

    def test_logout_without_a_token_is_refused(self, strict, user):
        strict.force_login(user)
        assert strict.post(reverse("v1:logout")).status_code == 403

    def test_a_csrf_failure_under_api_answers_in_json(self, strict, user):
        """A client calling `.json()` should see the problem, not a parse error."""
        response = strict.post(
            reverse("v1:login"),
            {"email": user.email, "password": PASSWORD},
            content_type="application/json",
        )
        assert response["Content-Type"].startswith("application/json")
        assert "X-CSRFToken" in response.json()["detail"]

    def test_login_with_a_token_succeeds(self, strict, user):
        """The protection must not be so strict that the real client cannot pass."""
        strict.get(reverse("v1:session"))
        token = strict.cookies["csrftoken"].value
        response = strict.post(
            reverse("v1:login"),
            {"email": user.email, "password": PASSWORD},
            content_type="application/json",
            headers={"x-csrftoken": token},
        )
        assert response.status_code == 200
        assert strict.session.get("_auth_user_id") == str(user.pk)


class TestLogout:
    def test_it_flushes_the_session(self, client, user):
        client.force_login(user)
        response = client.post(reverse("v1:logout"))
        assert response.status_code == 200
        assert "_auth_user_id" not in client.session

    def test_signing_out_when_already_signed_out_succeeds_quietly(self, client):
        """The client's intent is "ensure I am signed out"; a 403 is worse than
        a no-op."""
        assert client.post(reverse("v1:logout")).status_code == 200


class TestRegistration:
    PAYLOAD = {
        "email": "j.okafor@riverbank.example.nhs.uk",
        "first_name": "Joseph",
        "last_name": "Okafor",
        "organisation": "Riverbank Health Federation",
        "password": PASSWORD,
    }

    def test_it_creates_an_unverified_account_and_signs_them_in(self, client, db):
        response = client.post(
            reverse("v1:register"), self.PAYLOAD, content_type="application/json"
        )
        assert response.status_code == 201

        created = User.objects.get(email=self.PAYLOAD["email"])
        assert created.is_verified is False
        assert client.session.get("_auth_user_id") == str(created.pk)

    def test_it_sends_a_confirmation_email_and_says_so(self, client, db, mailoutbox):
        body = client.post(
            reverse("v1:register"), self.PAYLOAD, content_type="application/json"
        ).json()
        assert body["confirmation_email_sent"] is True
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == [self.PAYLOAD["email"]]

    def test_a_duplicate_address_is_rejected(self, client, user):
        response = client.post(
            reverse("v1:register"),
            {**self.PAYLOAD, "email": user.email},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "email" in response.json()

    def test_a_duplicate_address_is_rejected_case_insensitively(self, client, user):
        response = client.post(
            reverse("v1:register"),
            {**self.PAYLOAD, "email": user.email.upper()},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_a_weak_password_is_rejected_by_djangos_own_validators(self, client, db):
        """So the API enforces the same rules as the rest of the application,
        rather than offering a second opinion."""
        response = client.post(
            reverse("v1:register"),
            {**self.PAYLOAD, "password": "short1!"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "password" in response.json()
        assert not User.objects.filter(email=self.PAYLOAD["email"]).exists()
