from datetime import UTC, datetime
from uuid import UUID

import httpx
import pytest

from models import User


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
        verification_token_created_at=datetime(2024, 1, 1, 12, tzinfo=UTC),
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
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=UTC),
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={"token": "wrong-token"})
    assert res.status_code == 400
    assert "Invalid verification token" in res.json()["detail"]


@pytest.mark.asyncio
async def test_verify_missing_token_returns_422(test_client: httpx.AsyncClient):
    user = await User.objects.create(
        id=UUID("aaaaaaaa-bbbb-cccc-dddd-111111111111"),
        first_name="John",
        last_name="Smith",
        email_address="john.smith@example.com",
        password=await User.generate_password_hash("Password123!"),
        is_verified=False,
        verification_token="token-abc",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=UTC),
    )

    res = await test_client.post(f"/auth/verify/{user.id}/", json={})
    assert res.status_code == 422


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
