from datetime import UTC, datetime, timedelta
from secrets import token_hex
from uuid import UUID, uuid4

import ormar

from config import Config

from ._database import DateFieldsMixins, ormar_config
from .user import User


class Session(ormar.Model, DateFieldsMixins):
    ormar_config = ormar_config.copy(tablename="tbl_session")  # type: ignore

    id: UUID = ormar.UUID(
        primary_key=True,
        unique=True,
        nullable=False,
    )
    user: User = ormar.ForeignKey(User, related_name="sessions")
    token: str = ormar.String(max_length=255, unique=True)
    expires_at: datetime = ormar.DateTime(timezone=True)
    is_active: bool = ormar.Boolean(default=True)

    @classmethod
    async def create_session(cls, user: User) -> tuple["Session", str]:
        session_token = token_hex(32)
        expires_at = datetime.now(UTC) + timedelta(
            seconds=Config.Application.session_cookie_lifetime,
        )

        session = await cls.objects.create(
            id=uuid4(), user=user, token=session_token, expires_at=expires_at
        )
        return session, session_token

    async def extend_session(self):
        await self.update(
            expires_at=datetime.now(UTC)
            + timedelta(seconds=Config.Application.session_cookie_lifetime)
        )

    def is_expired(self) -> bool:
        return datetime.now(UTC) >= self.expires_at.replace(tzinfo=UTC)
