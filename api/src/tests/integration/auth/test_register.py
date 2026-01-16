import asyncio
from datetime import UTC, datetime
from uuid import UUID

import httpx
import pytest
from argon2 import PasswordHasher

from models import User


# Mock smtplib.SMTP used in common.verify_email with a simple MagicMock
@pytest.fixture(autouse=True)
def mock_smtp(monkeypatch):
    from unittest.mock import MagicMock

    smtp_mock = MagicMock(name="SMTP")
    smtp_instance = MagicMock(name="SMTPInstance")
    # Support context manager: with smtplib.SMTP(...) as server:
    smtp_mock.return_value.__enter__.return_value = smtp_instance
    smtp_mock.return_value.__exit__.return_value = False
    monkeypatch.setattr("common.verify_email.smtplib.SMTP", smtp_mock)
    return smtp_mock


@pytest.mark.asyncio
async def test_successful_register_creates_user_and_returns_id(
    test_client: httpx.AsyncClient,
    mock_smtp,
):
    payload = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe@example.test",
        "password": "SecurePassword123!",
    }

    response = await test_client.post("/auth/register/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "User registered successfully"
    assert "id" in data and data["id"]

    # Allow background task to run
    await asyncio.sleep(0)

    # Verify user persisted
    user = await User.objects.get_or_none(id=UUID(data["id"]))
    assert user is not None
    assert user.email_address == "jane.doe@example.test"
    assert user.password != payload["password"]
    ph = PasswordHasher()
    assert ph.verify(user.password, payload["password"])
    assert user.is_verified is False
    assert user.verification_token is not None
    assert user.verification_token_created_at is not None

    # SMTP called and a single message sent
    assert mock_smtp.called
    smtp_instance = mock_smtp.return_value.__enter__.return_value
    smtp_instance.send_message.assert_called_once()


@pytest.mark.asyncio
async def test_register_with_existing_email_returns_400(
    test_client: httpx.AsyncClient,
    mock_smtp,
):
    existing_email = "existing.user@example.com"
    hashed = PasswordHasher().hash("SomePassword123!")
    await User.objects.create(
        id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        first_name="Existing",
        last_name="User",
        email_address=existing_email,
        password=hashed,
        verification_token="abcd",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=UTC),
    )

    response = await test_client.post(
        "/auth/register/",
        json={
            "first_name": "New",
            "last_name": "User",
            "email": existing_email,
            "password": "AnotherPassword123!",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "A user with this email already exists."
    # No email should be attempted
    assert not mock_smtp.called


@pytest.mark.asyncio
async def test_register_with_invalid_email_returns_400(
    test_client: httpx.AsyncClient,
    mock_smtp,
):
    response = await test_client.post(
        "/auth/register/",
        json={
            "first_name": "Bad",
            "last_name": "Email",
            "email": "not-an-email",
            "password": "Password123!",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid email format"
    # No email should be attempted
    assert not mock_smtp.called
