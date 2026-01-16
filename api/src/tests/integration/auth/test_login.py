from datetime import UTC, datetime

import httpx
import pytest

from config import Config
from models import User


@pytest.mark.asyncio
async def test_successful_login(test_client: httpx.AsyncClient):
    password = "AnotherSecurePassword!"
    hashed_password = await User.generate_password_hash(password)

    user = await User.objects.create(
        id="123e4567-e89b-12d3-a456-426614174000",
        first_name="John",
        last_name="Doe",
        email_address="john.doe@example.com",
        password=hashed_password,
        organisation="ExampleOrg",
        job_role="Developer",
        verification_token="abcd",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=UTC),
    )

    response = await test_client.post(
        "/auth/login/",
        json={"email_address": user.email_address, "password": password},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == str(user.id)
    assert data["first_name"] == user.first_name
    assert data["last_name"] == user.last_name
    assert data["email_address"] == user.email_address
    assert Config.Application.session_cookie_name in response.cookies
    assert response.cookies[Config.Application.session_cookie_name] is not None


@pytest.mark.asyncio
async def test_login_invalid_credentials(test_client: httpx.AsyncClient):
    password = "AnotherSecurePassword!"
    hashed_password = await User.generate_password_hash(password)

    user = await User.objects.create(
        id="123e4567-e89b-12d3-a456-426614174000",
        first_name="John",
        last_name="Doe",
        email_address="john.doe@example.com",
        password=hashed_password,
        organisation="ExampleOrg",
        job_role="Developer",
        verification_token="abcd",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=UTC),
    )

    # Test with incorrect password
    response = await test_client.post(
        "/auth/login/",
        json={"email_address": user.email_address, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
    assert Config.Application.session_cookie_name not in response.cookies


@pytest.mark.asyncio
async def test_login_no_account(test_client: httpx.AsyncClient):
    response = await test_client.post(
        "/auth/login/",
        json={"email_address": "nonexistent@example.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
    assert Config.Application.session_cookie_name not in response.cookies


@pytest.mark.asyncio
async def test_login_no_password(test_client: httpx.AsyncClient):
    response = await test_client.post(
        "/auth/login/",
        json={"email_address": "nonexistent@example.com", "password": ""},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Username and password are required"
    assert Config.Application.session_cookie_name not in response.cookies


@pytest.mark.asyncio
async def test_login_bad_email_format(test_client: httpx.AsyncClient):
    response = await test_client.post(
        "/auth/login/",
        json={"email_address": "nonexistent@localhost@", "password": "oogliebooglie"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
    assert Config.Application.session_cookie_name not in response.cookies
