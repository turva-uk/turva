from models import User
import pytest
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_generate_password_hash():
    password = "SecurePassword123!"
    hashed_password = await User.generate_password_hash(password)
    assert hashed_password is not None
    assert isinstance(hashed_password, str)
    assert hashed_password != password  # Ensure the hash is different from the original password

    # Verify the hash using argon2 directly
    ph = PasswordHasher()
    assert ph.verify(hashed_password, password)
    with pytest.raises(VerifyMismatchError):
        ph.verify(hashed_password, "WrongPassword!")


@pytest.mark.asyncio
async def test_check_password():
    password = "AnotherSecurePassword!"
    hashed_password = await User.generate_password_hash(password)
    user = User(
        id="123e4567-e89b-12d3-a456-426614174000",
        first_name="John",
        last_name="Doe",
        email_address="john.doe@example.com",
        password=hashed_password,
        organisation="ExampleOrg",
        job_role="Developer",
        verification_token="abcd",
        verification_token_created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )
    assert await user.check_password(password)
    assert not await user.check_password("WrongPassword!")
