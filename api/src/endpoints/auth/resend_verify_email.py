from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request
from starlette.authentication import requires

from authentication.scope import Scope
from common.verify_email import handle_verification_email
from models import User

router = APIRouter()


@router.post("/verify-resend/")
@requires(Scope.AUTHENTICATED.value, 401)
async def verify_email(request: Request):
    """
    Resend the verification email to the currently authenticated user.

    If the user is already verified, a message indicating this will be returned.
    If a verification email has been sent in the last 10 minutes, an error will be
    returned to prevent spamming.

    If the email is successfully resent, a success message will be returned.

    Params:
        - request: Request - The HTTP request object, which must contain an
            authenticated user.

    Returns:
        - JSON response indicating success or failure of the email resend process.
    """

    user = await User.objects.get_or_none(id=request.user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified")

    # If a token has been sent in the last 10 minutes, don't allow another to be sent
    if user.verification_token_created_at and (
        datetime.now(tz=UTC) - user.verification_token_created_at.replace(tzinfo=UTC)
        < timedelta(minutes=10)
    ):
        raise HTTPException(
            status_code=400,
            detail="A verification token was recently sent, please wait before requesting another",
        )

    # Try to send the verification email
    try:
        await handle_verification_email(user)
        return {"message": "Verification email resent"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Failed to resend verification email") from e
