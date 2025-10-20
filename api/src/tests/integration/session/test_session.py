import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from models import User, Session
from config import Config


@pytest.mark.asyncio
async def test_create_session_returns_session_and_token(test_client):
    user = await User.objects.create(
        id=uuid4(),
        first_name="Sess",
        last_name="Ion",
        email_address="session.user@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=True,
    )

    session, token = await Session.create_session(user)

    # Session persisted and linked to user
    assert session.id is not None
    assert session.user.id == user.id

    # Token returned and stored on session
    assert isinstance(token, str) and len(token) == 64  # token_hex(32)
    assert session.token == token

    # Activity flag default and expiry near configured lifetime
    assert session.is_active is True
    now = datetime.now(timezone.utc)
    expected_delta = timedelta(seconds=Config.Application.session_cookie_lifetime)
    actual_delta = session.expires_at.replace(tzinfo=timezone.utc) - now
    # allow a small tolerance for runtime
    assert abs(actual_delta - expected_delta) < timedelta(seconds=5)


@pytest.mark.asyncio
async def test_extend_session_extends_expiry(test_client, freezer):
    user = await User.objects.create(
        id=uuid4(),
        first_name="Extend",
        last_name="Me",
        email_address="extend.user@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=True,
    )
    freezer.move_to("2024-06-01T10:00:00Z")
    session, _ = await Session.create_session(user)
    original_expires = session.expires_at.replace(tzinfo=timezone.utc)

    freezer.move_to("2024-06-01T11:00:00Z")
    await session.extend_session()
    # Reload to ensure persisted value is checked
    refreshed = await Session.objects.get(id=session.id)

    assert refreshed.expires_at.replace(tzinfo=timezone.utc) > original_expires
    # Extended by an hour
    assert refreshed.expires_at.replace(
        tzinfo=timezone.utc
    ) - original_expires == timedelta(hours=1)


@pytest.mark.asyncio
async def test_is_expired_false_when_future(test_client):
    user = await User.objects.create(
        id=uuid4(),
        first_name="Future",
        last_name="User",
        email_address="future.user@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=True,
    )

    session, _ = await Session.create_session(user)
    # Ensure in future
    refreshed = await Session.objects.get(id=session.id)
    assert refreshed.is_expired() is False


@pytest.mark.asyncio
async def test_is_expired_true_when_past(test_client):
    user = await User.objects.create(
        id=uuid4(),
        first_name="Past",
        last_name="User",
        email_address="past.user@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=True,
    )

    session, _ = await Session.create_session(user)
    # Force expiry in the past
    past = datetime.now(timezone.utc) - timedelta(seconds=1)
    await session.update(expires_at=past)
    refreshed = await Session.objects.get(id=session.id)

    assert refreshed.is_expired() is True
