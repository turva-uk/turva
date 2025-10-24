from ._database import ormar_config, DateFieldsMixins
import ormar
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from uuid import UUID
from datetime import timedelta, datetime, timezone
import secrets
from starlette.authentication import BaseUser


class User(ormar.Model, DateFieldsMixins, BaseUser):
    ormar_config = ormar_config.copy(tablename="tbl_user")  # type: ignore

    id: UUID = ormar.UUID(
        primary_key=True,
        unique=True,
        nullable=False,
    )
    first_name: str = ormar.String(max_length=50)
    last_name: str = ormar.String(max_length=50)
    password: str = ormar.Text(nullable=False)
    email_address: str = ormar.String(max_length=100, unique=True)
    is_verified: bool = ormar.Boolean(default=False)
    verification_token: str | None = ormar.String(max_length=100, nullable=True)
    verification_token_created_at: datetime | None = ormar.DateTime(
        nullable=True, timezone=True
    )
    is_active: bool = ormar.Boolean(default=True)
    organisation: str | None = ormar.String(max_length=100, nullable=True)
    job_role: str | None = ormar.String(max_length=100, nullable=True)
    is_cso: bool = ormar.Boolean(default=False)

    @classmethod
    async def generate_password_hash(cls, password: str):
        ph = PasswordHasher()
        return ph.hash(password)

    async def check_password(self, password: str):
        ph = PasswordHasher()
        try:
            return ph.verify(self.password, password)
        except VerifyMismatchError:
            return False

    async def get_verification_token(self) -> str:
        """
        Returns the user's email verification token.

        If the user is already verified, an error is raised.
        If the token has expired, a new token is generated, saved and returned.

        Returns:
            str: The email verification token.
        """

        if self.is_verified:
            raise ValueError("User is already verified.")

        token_lifetime = timedelta(hours=8)

        # If the token is not older than 10 minutes, raise an error
        if self.verification_token_created_at is not None and datetime.now(
            tz=timezone.utc
        ) - self.verification_token_created_at < timedelta(minutes=10):
            raise ValueError("Verification token cannot be recycled yet.")

        if (
            self.verification_token is None
            or self.verification_token_created_at is None
        ) or datetime.now(
            tz=timezone.utc
        ) - self.verification_token_created_at > token_lifetime:
            # Token has expired or was never created, generate a new one
            self.verification_token = secrets.token_urlsafe(48)
            self.verification_token_created_at = datetime.now(tz=timezone.utc)

            await self.update(
                verification_token=self.verification_token,
                verification_token_created_at=self.verification_token_created_at,
            )

        return self.verification_token

    async def has_verification_token_expired(self) -> bool:
        """
        Checks if the user's email verification token has expired.

        Returns:
            bool: True if the token has expired, False otherwise.
        """
        token_lifetime = timedelta(hours=8)
        return (
            datetime.now(tz=timezone.utc)
            - self.verification_token_created_at.replace(tzinfo=timezone.utc)
            > token_lifetime
            if self.verification_token_created_at
            else True
        )
