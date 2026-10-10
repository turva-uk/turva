"""Tests for the registration, login and verification views.

These replace the FastAPI integration tests. They run against PostgreSQL rather
than SQLite, which is deliberate: the previous suite ran on SQLite and so could
not catch the PostgreSQL connection regression that reached main with all 42
tests passing.
"""

from __future__ import annotations

import re

import pytest
from django.core import mail
from django.urls import reverse

from app.accounts.emails import verification_url
from app.accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery-7"

REGISTRATION = {
    "email": "a.patel@riverbank.example.nhs.uk",
    "first_name": "Anita",
    "last_name": "Patel",
    "organisation": "Riverbank Health Federation",
    "job_role": "Clinical Safety Officer",
    "password1": PASSWORD,
    "password2": PASSWORD,
}


@pytest.fixture
def verified_user(db) -> User:
    user = User.objects.create_user(
        email="j.okafor@riverbank.example.nhs.uk",
        password=PASSWORD,
        first_name="Joseph",
        last_name="Okafor",
    )
    user.is_verified = True
    user.save(update_fields=["is_verified"])
    return user


@pytest.fixture
def unverified_user(db) -> User:
    return User.objects.create_user(
        email="s.whitlock@riverbank.example.nhs.uk",
        password=PASSWORD,
        first_name="Sarah",
        last_name="Whitlock",
    )


class TestRegistration:
    def test_get_renders_the_form(self, client):
        response = client.get(reverse("accounts:register"))
        assert response.status_code == 200
        assert "form" in response.context

    def test_successful_registration_creates_an_unverified_user(self, client):
        response = client.post(reverse("accounts:register"), REGISTRATION)
        assert response.status_code == 302
        user = User.objects.get(email=REGISTRATION["email"])
        assert user.is_verified is False
        assert user.first_name == "Anita"
        assert user.organisation == "Riverbank Health Federation"

    def test_registration_sends_a_verification_email(self, client):
        client.post(reverse("accounts:register"), REGISTRATION)
        assert len(mail.outbox) == 1
        message = mail.outbox[0]
        assert message.to == [REGISTRATION["email"]]
        assert "confirm" in message.subject.lower()
        user = User.objects.get(email=REGISTRATION["email"])
        assert user.verification_token in message.body

    @pytest.mark.parametrize(
        ("field", "token"),
        [
            ("email", "username"),
            ("first_name", "given-name"),
            ("last_name", "family-name"),
            ("organisation", "organization"),
            ("job_role", "organization-title"),
            ("password1", "new-password"),
            ("password2", "new-password"),
        ],
    )
    def test_fields_carry_autofill_tokens(self, client, field, token):
        """Browsers and password managers need these, and WCAG 2.2 SC 1.3.5 asks for them.

        Chrome logs a console warning without them, which is how this was found.
        """
        html = client.get(reverse("accounts:register")).content.decode()
        tag = re.search(rf'<input[^>]*name="{field}"[^>]*>', html)
        assert tag, f"no input rendered for {field}"
        assert f'autocomplete="{token}"' in tag.group(0), (
            f'{field} should carry autocomplete="{token}", got: {tag.group(0)}'
        )

    def test_login_and_registration_agree_on_the_identifier_token(self, client):
        """Otherwise a credential saved at registration is not offered at sign-in."""

        def token_for(url: str, field: str) -> str | None:
            html = client.get(url).content.decode()
            tag = re.search(rf'<input[^>]*name="{field}"[^>]*>', html).group(0)
            found = re.search(r'autocomplete="([^"]+)"', tag)
            return found.group(1) if found else None

        assert token_for(reverse("accounts:register"), "email") == token_for(
            reverse("accounts:login"), "username"
        )

    def test_verification_link_survives_the_wire_encoding(self, client):
        """The link must still work after MIME encoding, not just in `message.body`.

        The verification URL is about 135 characters, which is longer than the
        78-character line limit, so both parts are sent quoted-printable with
        soft line breaks inside the URL. Asserting on `message.body` - the
        pre-encoding Python string - would pass even if the encoded form arrived
        broken, and a broken confirmation link is a dead end for the user.
        """
        import email as email_lib

        client.post(reverse("accounts:register"), REGISTRATION)
        user = User.objects.get(email=REGISTRATION["email"])
        expected = verification_url(user, user.verification_token)

        parsed = email_lib.message_from_bytes(mail.outbox[0].message().as_bytes())
        parts = [p for p in parsed.walk() if p.get_content_maintype() != "multipart"]
        assert parts, "the message has no body parts"

        for part in parts:
            charset = part.get_content_charset() or "utf-8"
            decoded = part.get_payload(decode=True).decode(charset)
            assert expected in decoded, (
                f"the {part.get_content_type()} part does not contain an intact "
                f"verification URL after {part.get('Content-Transfer-Encoding')} decoding"
            )

    def test_email_has_both_plain_text_and_html_parts(self, client):
        """Some NHS mail clients strip HTML; the plain part must stand alone."""
        client.post(reverse("accounts:register"), REGISTRATION)
        message = mail.outbox[0]
        assert message.body.strip()
        assert len(message.alternatives) == 1
        html, mimetype = message.alternatives[0][0], message.alternatives[0][1]
        assert mimetype == "text/html"
        assert "verify" in html or "confirm" in html.lower()

    def test_registration_signs_the_user_in(self, client):
        client.post(reverse("accounts:register"), REGISTRATION)
        response = client.get(reverse("accounts:verify_notice"))
        assert response.status_code == 200
        assert response.context["user"].is_authenticated

    def test_registration_redirects_to_the_verification_notice(self, client):
        response = client.post(reverse("accounts:register"), REGISTRATION)
        assert response["Location"] == reverse("accounts:verify_notice")

    def test_duplicate_email_is_rejected(self, client, verified_user):
        response = client.post(
            reverse("accounts:register"),
            {**REGISTRATION, "email": verified_user.email},
        )
        assert response.status_code == 200
        assert "already exists" in response.content.decode()
        assert User.objects.filter(email=verified_user.email).count() == 1

    def test_duplicate_email_differing_only_in_case_is_rejected(self, client, verified_user):
        """PostgreSQL unique indexes are case-sensitive, so this needs its own check.

        Two accounts for J.Okafor@... and j.okafor@... would be the same mailbox
        in practice, and would make "an account already exists" advice wrong.
        """
        response = client.post(
            reverse("accounts:register"),
            {**REGISTRATION, "email": verified_user.email.upper()},
        )
        assert response.status_code == 200
        assert User.objects.count() == 1

    def test_invalid_email_is_rejected(self, client):
        response = client.post(
            reverse("accounts:register"), {**REGISTRATION, "email": "not-an-email"}
        )
        assert response.status_code == 200
        assert User.objects.count() == 0

    def test_mismatched_passwords_are_rejected(self, client):
        response = client.post(
            reverse("accounts:register"), {**REGISTRATION, "password2": "something-else-entirely"}
        )
        assert response.status_code == 200
        assert User.objects.count() == 0

    def test_short_password_is_rejected(self, client):
        """MinimumLengthValidator is configured at 12 characters."""
        response = client.post(
            reverse("accounts:register"),
            {**REGISTRATION, "password1": "short1!", "password2": "short1!"},
        )
        assert response.status_code == 200
        assert User.objects.count() == 0

    def test_password_is_never_stored_in_clear(self, client):
        client.post(reverse("accounts:register"), REGISTRATION)
        user = User.objects.get(email=REGISTRATION["email"])
        assert PASSWORD not in user.password
        assert user.password.startswith("argon2$")

    def test_signed_in_user_is_sent_to_the_safety_file_list(self, client, verified_user):
        client.force_login(verified_user)
        response = client.get(reverse("accounts:register"))
        assert response["Location"] == reverse("safetyfiles:list")


class TestLogin:
    def test_correct_credentials_sign_in(self, client, verified_user):
        response = client.post(
            reverse("accounts:login"),
            {"username": verified_user.email, "password": PASSWORD},
        )
        assert response.status_code == 302
        assert response.wsgi_request.user.is_authenticated

    def test_wrong_password_is_refused(self, client, verified_user):
        response = client.post(
            reverse("accounts:login"),
            {"username": verified_user.email, "password": "wrong-password-entirely"},
        )
        assert response.status_code == 200
        assert not response.wsgi_request.user.is_authenticated

    def test_unknown_account_gives_the_same_message_as_a_wrong_password(
        self, client, verified_user
    ):
        """Account enumeration: the two cases must be indistinguishable."""
        wrong_password = client.post(
            reverse("accounts:login"),
            {"username": verified_user.email, "password": "wrong-password-entirely"},
        )
        no_account = client.post(
            reverse("accounts:login"),
            {"username": "nobody@riverbank.example.nhs.uk", "password": "wrong-password-entirely"},
        )
        assert wrong_password.status_code == no_account.status_code
        assert (
            wrong_password.context["form"].errors["__all__"]
            == no_account.context["form"].errors["__all__"]
        )

    def test_inactive_user_cannot_sign_in(self, client, verified_user):
        verified_user.is_active = False
        verified_user.save(update_fields=["is_active"])
        response = client.post(
            reverse("accounts:login"),
            {"username": verified_user.email, "password": PASSWORD},
        )
        assert not response.wsgi_request.user.is_authenticated

    def test_unverified_user_can_sign_in_but_is_sent_to_verify(self, client, unverified_user):
        """Signing in is allowed; doing anything that matters is not."""
        client.post(
            reverse("accounts:login"),
            {"username": unverified_user.email, "password": PASSWORD},
        )
        response = client.get(reverse("safetyfiles:list"))
        assert response["Location"] == reverse("accounts:verify_notice")

    def test_logout_requires_post(self, client, verified_user):
        """A GET logout can be triggered by any page that embeds the URL."""
        client.force_login(verified_user)
        response = client.get(reverse("accounts:logout"))
        assert response.status_code == 405

    def test_logout_signs_out(self, client, verified_user):
        client.force_login(verified_user)
        response = client.post(reverse("accounts:logout"))
        assert response.status_code == 302
        assert not response.wsgi_request.user.is_authenticated


class TestEmailVerification:
    def _verify_url(self, user: User, token: str) -> str:
        return reverse("accounts:verify", kwargs={"user_id": user.pk, "token": token})

    def test_valid_link_verifies_the_address(self, client, unverified_user):
        token = unverified_user.issue_verification_token()
        response = client.get(self._verify_url(unverified_user, token))
        assert response.status_code == 302
        unverified_user.refresh_from_db()
        assert unverified_user.is_verified is True

    def test_invalid_token_returns_400(self, client, unverified_user):
        unverified_user.issue_verification_token()
        response = client.get(self._verify_url(unverified_user, "wrong-token"))
        assert response.status_code == 400
        unverified_user.refresh_from_db()
        assert unverified_user.is_verified is False

    def test_unknown_user_returns_404(self, client):
        import uuid

        response = client.get(
            reverse("accounts:verify", kwargs={"user_id": uuid.uuid4(), "token": "x"})
        )
        assert response.status_code == 404

    def test_already_verified_user_is_told_so(self, client, verified_user):
        response = client.get(self._verify_url(verified_user, "any-token"), follow=True)
        assert response.status_code == 200
        assert "already confirmed" in response.content.decode()

    def test_link_works_without_being_signed_in(self, client, unverified_user):
        """People open email on a different device from the one they signed up on."""
        token = unverified_user.issue_verification_token()
        response = client.get(self._verify_url(unverified_user, token))
        assert response["Location"] == reverse("accounts:login")
        unverified_user.refresh_from_db()
        assert unverified_user.is_verified is True

    def test_signed_in_user_lands_on_the_safety_file_list(self, client, unverified_user):
        client.force_login(unverified_user)
        token = unverified_user.issue_verification_token()
        response = client.get(self._verify_url(unverified_user, token))
        assert response["Location"] == reverse("safetyfiles:list")


class TestResendVerification:
    def test_resend_requires_sign_in(self, client):
        response = client.post(reverse("accounts:verify_resend"))
        assert response.status_code == 302
        assert reverse("accounts:login") in response["Location"]

    def test_resend_requires_post(self, client, unverified_user):
        client.force_login(unverified_user)
        assert client.get(reverse("accounts:verify_resend")).status_code == 405

    def test_resend_sends_an_email(self, client, unverified_user):
        client.force_login(unverified_user)
        client.post(reverse("accounts:verify_resend"))
        assert len(mail.outbox) == 1

    def test_resend_within_the_cooldown_warns_and_sends_nothing(self, client, unverified_user):
        client.force_login(unverified_user)
        client.post(reverse("accounts:verify_resend"))
        mail.outbox.clear()

        response = client.post(reverse("accounts:verify_resend"), follow=True)
        assert mail.outbox == []
        assert "sent recently" in response.content.decode()

    def test_resend_for_a_verified_user_sends_nothing(self, client, verified_user):
        client.force_login(verified_user)
        response = client.post(reverse("accounts:verify_resend"), follow=True)
        assert mail.outbox == []
        assert "already confirmed" in response.content.decode()

    def test_smtp_failure_is_reported_not_raised(self, client, unverified_user, monkeypatch):
        """A failed send must not lose the user's place.

        The account exists and the token is issued; they can try again.
        """
        from app.accounts import views

        def explode(*args, **kwargs):
            raise OSError("connection refused")

        monkeypatch.setattr(views, "send_verification_email", explode)
        client.force_login(unverified_user)
        response = client.post(reverse("accounts:verify_resend"), follow=True)
        assert response.status_code == 200
        assert "could not send" in response.content.decode()


class TestPasswordReset:
    """Django's views, so these check the wiring rather than the mechanism."""

    def test_reset_request_sends_an_email(self, client, verified_user):
        response = client.post(reverse("accounts:password_reset"), {"email": verified_user.email})
        assert response.status_code == 302
        assert len(mail.outbox) == 1
        assert verified_user.email in mail.outbox[0].to

    def test_reset_for_an_unknown_address_reveals_nothing(self, client):
        """Same response as a known address, and no email sent."""
        response = client.post(
            reverse("accounts:password_reset"), {"email": "nobody@riverbank.example.nhs.uk"}
        )
        assert response.status_code == 302
        assert response["Location"] == reverse("accounts:password_reset_done")
        assert mail.outbox == []

    def test_reset_email_contains_a_working_link(self, client, verified_user):
        client.post(reverse("accounts:password_reset"), {"email": verified_user.email})
        body = mail.outbox[0].body
        # Extract the reset path from the email and follow it.
        start = body.index("/accounts/password-reset/")
        end = min(
            (body.index(ch, start) for ch in " \n" if ch in body[start:]),
            default=len(body),
        )
        link = body[start:end].strip()
        response = client.get(link, follow=True)
        assert response.status_code == 200
        assert "new password" in response.content.decode().lower()

    def test_a_new_password_can_be_set_and_used(self, client, verified_user):
        client.post(reverse("accounts:password_reset"), {"email": verified_user.email})
        body = mail.outbox[0].body
        start = body.index("/accounts/password-reset/")
        link = body[start:].split()[0].strip()

        # Following the link redirects to a URL with the token moved into the
        # session, which is the form that accepts a POST.
        form_response = client.get(link, follow=True)
        new_password = "a-completely-different-23"
        client.post(
            form_response.redirect_chain[-1][0],
            {"new_password1": new_password, "new_password2": new_password},
        )

        verified_user.refresh_from_db()
        assert verified_user.check_password(new_password)


class TestAccessControl:
    def test_safety_file_list_requires_sign_in(self, client):
        response = client.get(reverse("safetyfiles:list"))
        assert response.status_code == 302
        assert reverse("accounts:login") in response["Location"]

    def test_safety_file_list_requires_a_verified_address(self, client, unverified_user):
        client.force_login(unverified_user)
        response = client.get(reverse("safetyfiles:list"))
        assert response["Location"] == reverse("accounts:verify_notice")

    def test_verified_user_reaches_the_safety_file_list(self, client, verified_user):
        client.force_login(verified_user)
        assert client.get(reverse("safetyfiles:list")).status_code == 200

    def test_unverified_user_sees_a_banner_prompting_confirmation(self, client, unverified_user):
        client.force_login(unverified_user)
        response = client.get(reverse("accounts:verify_notice"))
        assert "not yet confirmed" in response.content.decode()
