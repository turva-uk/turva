import datetime

from fastapi.requests import HTTPConnection
from starlette.authentication import AuthCredentials, AuthenticationBackend, BaseUser

from config import Config
from models import Session


class TurvaAuthenticationBackend(AuthenticationBackend):
    """
    This middleware does behind the scenes stuff to maintain
    the user's session.

    It checks that the user's session is valid and that the user
    is active. If the session is invalid or the user is not active,
    the user's session is deleted, logging them out.

    This also handles updating the user's session expiry on each
    request.
    """

    async def authenticate(self, conn: HTTPConnection) -> tuple[AuthCredentials, BaseUser] | None:
        # We could also check if the user's valid in LDAP,
        # but that would hit the LDAP server on every
        # request, which is not ideal, but possible.
        # Need to investigate.

        # This checks if the session middleware has loaded correctly
        _ = conn.session

        # Check if the session cookie is present
        if Config.Application.session_cookie_name not in conn.cookies:
            # No cookie so nothing to authenticate
            return None

        # Get the session from the session cookie
        session = await Session.objects.select_related("user").get_or_none(
            token=conn.cookies[Config.Application.session_cookie_name]
        )

        if session is None:
            # The session does not exist
            return None

        # If the user is not active, remove their session
        # Or if the user's session has expired
        if session.user.is_active is False or session.is_expired():
            await session.delete()
            return None

        # Update the session expiry
        await session.update(
            expires_at=datetime.datetime.now(tz=datetime.UTC)
            + datetime.timedelta(seconds=Config.Application.session_cookie_lifetime)
        )

        # Return the user + their scopes
        return AuthCredentials([]), session.user
