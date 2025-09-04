from ._database import ormar_config, DateFieldsMixins
import ormar
from .user import User
from secrets import token_hex
from config import Config
from datetime import datetime, timedelta, timezone

class Session(ormar.Model, DateFieldsMixins):
    ormar_config = ormar_config.copy(tablename="tbl_session")    

    id: str = ormar.String(primary_key=True, max_length=36)
    user: User = ormar.ForeignKey(User, related_name="sessions")
    token: str = ormar.String(max_length=255, unique=True)
    expires_at: ormar.DateTime = ormar.DateTime()
    is_active: bool = ormar.Boolean(default=True)

    @classmethod
    async def create_session(cls, user: User):
        token = token_hex(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=Config.Application.session_cookie_lifetime)

        session = cls(user=user, token=token, expires_at=expires_at)
        await session.save()
        return session

    async def extend_session(self):
        self.expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=Config.Application.session_cookie_lifetime)
        await self.update()
