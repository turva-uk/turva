"""Tests for the user model and email verification.

Ported from the FastAPI suite. The verification timing rules - an eight-hour
lifetime and a ten-minute cooldown - are asserted at their boundaries, because
those are the values a refactor is most likely to change by accident.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
import time_machine
from django.utils import timezone

from app.accounts.models import (
    VERIFICATION_TOKEN_COOLDOWN,
    VERIFICATION_TOKEN_LIFETIME,
    AlreadyVerified,
    TokenCooldownActive,
    User,
)

pytestmark = pytest.mark.django_db


class TestUserCreation:
    def test_create_user_normalises_the_email_domain(self):
        user = User.objects.create_user(
            email="A.Patel@RIVERBANK.EXAMPLE.NHS.UK",
            password="correct-horse-battery-7",
            first_name="Anita",
            last_name="Patel",
        )
        # BaseUserManager lowercases the domain but preserves the local part,
        # which is correct: the local part is case-sensitive per RFC 5321 even
        # though almost no provider treats it that way.
        assert user.email == "A.Patel@riverbank.example.nhs.uk"

    def test_password_is_hashed_with_argon2(self):
        user = User.objects.create_user(
            email="a@riverbank.example.nhs.uk",
            password="correct-horse-battery-7",
            first_name="A",
            last_name="B",
        )
        assert user.password.startswith("argon2$"), user.password[:20]
        assert user.check_password("correct-horse-battery-7")
        assert not user.check_password("wrong")

    def test_email_is_required(self):
        with pytest.raises(ValueError, match="email address is required"):
            User.objects.create_user(email="", password="x", first_name="A", last_name="B")

    def test_new_users_are_unverified(self):
        user = User.objects.create_user(
            email="a@riverbank.example.nhs.uk", password="x", first_name="A", last_name="B"
        )
        assert user.is_verified is False
        assert user.is_active is True
        assert user.is_cso is False

    def test_primary_key_is_a_uuid_not_a_sequence(self):
        """Verification links contain the identifier.

        A sequential key would disclose the number of accounts and let others be
        guessed.
        """
        import uuid

        user = User.objects.create_user(
            email="a@riverbank.example.nhs.uk", password="x", first_name="A", last_name="B"
        )
        assert isinstance(user.pk, uuid.UUID)

    def test_superuser_is_created_verified_and_staff(self):
        user = User.objects.create_superuser(
            email="admin@riverbank.example.nhs.uk",
            password="correct-horse-battery-7",
            first_name="Ad",
            last_name="Min",
        )
        assert user.is_staff and user.is_superuser
        # Someone creating an account from the command line has already
        # demonstrated control of the system; there is nothing to confirm.
        assert user.is_verified

    def test_full_name(self):
        user = User(first_name="Anita", last_name="Patel")
        assert user.get_full_name() == "Anita Patel"
        assert user.get_short_name() == "Anita"


@pytest.fixture
def user(db) -> User:
    return User.objects.create_user(
        email="a.patel@riverbank.example.nhs.uk",
        password="correct-horse-battery-7",
        first_name="Anita",
        last_name="Patel",
    )


class TestIssuingVerificationTokens:
    def test_first_call_issues_a_token(self, user):
        token = user.issue_verification_token()
        assert token
        user.refresh_from_db()
        assert user.verification_token == token
        assert user.verification_token_created_at is not None

    def test_token_is_long_enough_to_resist_guessing(self, user):
        # secrets.token_urlsafe(48) is 48 bytes of entropy, base64url encoded.
        assert len(user.issue_verification_token()) >= 60

    def test_already_verified_user_cannot_request_a_token(self, user):
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        with pytest.raises(AlreadyVerified):
            user.issue_verification_token()

    def test_second_request_within_the_cooldown_is_refused(self, user):
        user.issue_verification_token()
        with pytest.raises(TokenCooldownActive):
            user.issue_verification_token()

    def test_request_just_inside_the_cooldown_is_refused(self, user):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_COOLDOWN - timedelta(seconds=1))
            with pytest.raises(TokenCooldownActive):
                user.issue_verification_token()

    def test_request_after_the_cooldown_reuses_a_still_valid_token(self, user):
        """A token that has not expired is reused, not replaced.

        Otherwise a user who requests a resend and then clicks the link in the
        earlier email is told it is broken, which is confusing and makes people
        think the system is faulty.
        """
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            first = user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_COOLDOWN + timedelta(seconds=1))
            second = user.issue_verification_token()
        assert first == second

    def test_expired_token_is_replaced(self, user):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            first = user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_LIFETIME + timedelta(seconds=1))
            second = user.issue_verification_token()
        assert first != second


class TestTokenExpiry:
    def test_user_with_no_token_counts_as_expired(self, user):
        """So that an empty token cannot be accepted by omission."""
        assert user.verification_token_created_at is None
        assert user.is_token_expired is True

    def test_fresh_token_has_not_expired(self, user):
        user.issue_verification_token()
        assert user.is_token_expired is False

    def test_token_just_inside_its_lifetime_is_valid(self, user):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_LIFETIME - timedelta(seconds=1))
            assert user.is_token_expired is False

    def test_token_just_past_its_lifetime_has_expired(self, user):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_LIFETIME + timedelta(seconds=1))
            assert user.is_token_expired is True


class TestVerifyingEmail:
    def test_correct_token_verifies(self, user):
        token = user.issue_verification_token()
        assert user.verify_email(token) is True
        user.refresh_from_db()
        assert user.is_verified is True

    def test_token_is_cleared_after_use(self, user):
        """Single use. The token travels in a URL, so it reaches server logs,
        proxy logs and browser history; it should stop working once spent."""
        token = user.issue_verification_token()
        user.verify_email(token)
        user.refresh_from_db()
        assert user.verification_token == ""
        assert user.verification_token_created_at is None

    def test_replaying_a_spent_token_does_not_fail_loudly(self, user):
        """The user is already verified, so their goal is met."""
        token = user.issue_verification_token()
        user.verify_email(token)
        assert user.verify_email(token) is True

    def test_wrong_token_is_rejected(self, user):
        user.issue_verification_token()
        assert user.verify_email("not-the-token") is False
        user.refresh_from_db()
        assert user.is_verified is False

    def test_empty_token_is_rejected(self, user):
        user.issue_verification_token()
        assert user.verify_email("") is False

    def test_expired_token_is_rejected(self, user):
        with time_machine.travel(timezone.now(), tick=False) as traveller:
            token = user.issue_verification_token()
            traveller.shift(VERIFICATION_TOKEN_LIFETIME + timedelta(seconds=1))
            assert user.verify_email(token) is False
        user.refresh_from_db()
        assert user.is_verified is False

    def test_user_with_no_token_cannot_be_verified(self, user):
        assert user.verify_email("anything") is False
