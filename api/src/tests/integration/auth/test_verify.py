import pytest
import httpx
from models import User, Session
from datetime import datetime, timezone
from uuid import UUID
from unittest.mock import AsyncMock
from config import Config


@pytest.mark.asyncio
async def test_verify_success_marks_user_verified(test_client: httpx.AsyncClient, freezer):
    freezer.move_to("2024-01-01T12:30:00Z")
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        first_name="Jane",
        last_name="Doe",
        email_address="jane.doe@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token="token-123",
        verification_token_created_at=datetime(2024, 1, 1, 12, tzinfo=timezone.utc),
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"token": "token-123"})
    assert res.status_code == 200
    assert res.json()["message"] == "Email verified successfully"

    refreshed = await User.objects.get(id=user.id)
    assert refreshed.is_verified is True


@pytest.mark.asyncio
async def test_verify_invalid_token_returns_400(test_client: httpx.AsyncClient):
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-ffffffffffff"),
        first_name="Jane",
        last_name="Doe",
        email_address="jane2.doe@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token="right-token",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"token": "wrong-token"})
    assert res.status_code == 400
    assert "Invalid verification token" in res.json()["detail"]


@pytest.mark.asyncio
async def test_verify_missing_token_returns_400(test_client: httpx.AsyncClient):
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-111111111111"),
        first_name="John",
        last_name="Smith",
        email_address="john.smith@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token="token-abc",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={})
    assert res.status_code == 400
    assert res.json()["detail"] == "Verification token is required"


@pytest.mark.asyncio
async def test_verify_user_not_found_returns_404(test_client: httpx.AsyncClient):
    res = await test_client.post(
        "/auth/verify/aaaaaaaa-bbbb-cccc-dddd-000000000000/", json={"token": "x"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_verify_already_verified_returns_message(test_client: httpx.AsyncClient):
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-222222222222"),
        first_name="Alice",
        last_name="Doe",
        email_address="alice@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=True,
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"token": "anything"})
    assert res.status_code == 200
    assert res.json()["message"] == "User is already verified"


@pytest.mark.asyncio
async def test_resend_requires_login_returns_401(test_client: httpx.AsyncClient, monkeypatch):
    # Patch the email handler to ensure it is not called
    mock_sender = AsyncMock()
    monkeypatch.setattr("endpoints.auth.verify.handle_verification_email", mock_sender)

    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-333333333333"),
        first_name="Bob",
        last_name="Builder",
        email_address="bob@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token=None,
        verification_token_created_at=None,
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"resend": True})
    assert res.status_code == 401
    assert "You must be logged in" in res.json()["detail"]
    mock_sender.assert_not_awaited()


@pytest.mark.asyncio
async def test_resend_when_logged_in_succeeds_and_sends_email(
    test_client: httpx.AsyncClient, monkeypatch
):
    mock_sender = AsyncMock()
    monkeypatch.setattr("endpoints.auth.verify.handle_verification_email", mock_sender)

    password = "Password123!"
    hashed = await User.generate_password_hash(password)
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-444444444444"),
        first_name="Charlie",
        last_name="Day",
        email_address="charlie@example.com",
        password=hashed,
        is_verified=False,
        verification_token=None,
        verification_token_created_at=None,
    )
    # Get a session cookie
    session, session_token = await Session.create_session(user)
    assert session is not None

    # Get the session cookie
    session_cookie = session.token

    test_client.cookies.set(Config.Application.session_cookie_name, session_cookie)

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"resend": True})
    assert res.status_code == 200
    assert res.json()["message"] == "Verification email resent"
    mock_sender.assert_awaited_once()


@pytest.mark.asyncio
async def test_resend_raises_value_error_returns_400(test_client: httpx.AsyncClient):
    password = "Password123!"
    hashed = await User.generate_password_hash(password)
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-555555555555"),
        first_name="Dana",
        last_name="Scully",
        email_address="dana@example.com",
        password=hashed,
        is_verified=False,
        verification_token="recent",
        verification_token_created_at=datetime.now(tz=timezone.utc),
    )

    # Get a session cookie
    session, session_token = await Session.create_session(user)
    assert session is not None

    # Get the session cookie
    session_cookie = session.token

    test_client.cookies.set(Config.Application.session_cookie_name, session_cookie)

    res = await test_client.post(
        f"/auth/verify/{user.id}/",
        json={"resend": True},
    )
    assert res.status_code == 400
    assert (
        res.json()["detail"]
        == "A verification token was recently sent, please wait before requesting another"
    )


@pytest.mark.asyncio
async def test_resend_others_verification_email(test_client: httpx.AsyncClient, monkeypatch):
    mock_sender = AsyncMock()
    monkeypatch.setattr("endpoints.auth.verify.handle_verification_email", mock_sender)

    password = "Password123!"
    hashed = await User.generate_password_hash(password)
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-444444444444"),
        first_name="Charlie",
        last_name="Day",
        email_address="charlie@example.com",
        password=hashed,
        is_verified=False,
        verification_token=None,
        verification_token_created_at=None,
    )

    other_user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-666666666666"),
        first_name="Eve",
        last_name="Polastri",
        email_address="eve@example.com",
        password=hashed,
        is_verified=False,
        verification_token=None,
        verification_token_created_at=None,
    )

    # Get a session cookie
    session, session_token = await Session.create_session(user)
    assert session is not None

    # Get the session cookie
    session_cookie = session.token

    test_client.cookies.set(Config.Application.session_cookie_name, session_cookie)

    res = await test_client.post(f"/auth/verify/{other_user.id}/", json={"resend": True})
    assert res.status_code == 403
    assert res.json()["detail"] == "You can only resend verification email for your own account"
    mock_sender.assert_not_awaited()
