import base64
import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID

import httpx
import pytest
from itsdangerous import TimestampSigner

from config import Config
from models import Session, User


def create_signed_session_cookie(session_data: dict) -> str:
    """Create a signed session cookie matching Starlette SessionMiddleware format."""
    signer = TimestampSigner(Config.Application.secret_key)
    data = base64.b64encode(json.dumps(session_data).encode("utf-8"))
    return signer.sign(data).decode("utf-8")


def set_session_cookie(test_client: httpx.AsyncClient, session_key: str):
    """Helper to set a signed session cookie on the test client."""
    cookie_value = create_signed_session_cookie({"session_token": session_key})
    test_client.cookies.set(Config.Application.session_cookie_name, cookie_value)


@pytest.mark.asyncio
async def test_resend_requires_login_returns_401(test_client: httpx.AsyncClient, monkeypatch):
    mock_sender = AsyncMock()
    monkeypatch.setattr("endpoints.auth.resend_verify_email.handle_verification_email", mock_sender)

    await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-333333333333"),
        first_name="Bob",
        last_name="Builder",
        email_address="bob@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token=None,
        verification_token_created_at=None,
    )

    res = await test_client.post("/auth/verify-resend/")
    assert res.status_code == 401
    mock_sender.assert_not_awaited()


@pytest.mark.asyncio
async def test_resend_when_logged_in_succeeds_and_sends_email(
    test_client: httpx.AsyncClient, monkeypatch
):
    mock_sender = AsyncMock()
    monkeypatch.setattr("endpoints.auth.resend_verify_email.handle_verification_email", mock_sender)

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

    session, session_key = await Session.create_session(user)
    set_session_cookie(test_client, session_key)

    res = await test_client.post("/auth/verify-resend/")
    assert res.status_code == 200
    assert res.json()["message"] == "Verification email resent"
    mock_sender.assert_awaited_once()


@pytest.mark.asyncio
async def test_resend_rate_limited_returns_400(test_client: httpx.AsyncClient):
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
        verification_token_created_at=datetime.now(tz=UTC),
    )

    session, session_key = await Session.create_session(user)
    test_client.cookies.set(
        Config.Application.session_cookie_name,
        create_signed_session_cookie({"session_token": session_key}),
    )

    res = await test_client.post("/auth/verify-resend/")
    assert res.status_code == 400
    assert (
        res.json()["detail"]
        == "A verification token was recently sent, please wait before requesting another"
    )


@pytest.mark.asyncio
async def test_resend_already_verified_returns_message(test_client: httpx.AsyncClient):
    password = "Password123!"
    hashed = await User.generate_password_hash(password)
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-666666666666"),
        first_name="Alice",
        last_name="Doe",
        email_address="alice@example.com",
        password=hashed,
        is_verified=True,
    )

    session, session_key = await Session.create_session(user)
    test_client.cookies.set(
        Config.Application.session_cookie_name,
        create_signed_session_cookie({"session_token": session_key}),
    )

    res = await test_client.post("/auth/verify-resend/")
    assert res.status_code == 400
