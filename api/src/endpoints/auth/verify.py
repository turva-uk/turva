from fastapi import APIRouter, Request, HTTPException
from models import User
from pydantic import BaseModel
from common.verify_email import handle_verification_email
from uuid import UUID
from starlette.authentication import UnauthenticatedUser
from datetime import datetime, timedelta, timezone

router = APIRouter()


class VerifyRequest(BaseModel):
    token: str | None = None
    resend: bool | None = False


@router.post("/verify/{user_id}/")
async def verify_email(request: Request, body: VerifyRequest, user_id: str):
    """
    Verify a user's email address using a token or resend the verification email.

    If resend is True, a new verification email will be sent to the user (if old token
    is older than 10 minutes).
    If a token is provided, it will be checked against the user's stored token
    to verify the email address.

    If the token is valid, the user's email will be marked as verified.
    If the token is invalid, an error will be returned.

    Params:
        - user_id: str - The ID of the user to verify.
        - POST body: VerifyRequest - The request body containing the token and resend flag.

    Returns:
        - JSON response indicating success or failure of the verification process.
    """

    user = await User.objects.get_or_none(id=UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "User is already verified"}

    if body.resend:
        # Check user is logged in
        if not request.user or isinstance(request.user, UnauthenticatedUser):
            raise HTTPException(
                status_code=401,
                detail="You must be logged in as this user to resend verification email",
            )
        if request.user.id != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only resend verification email for your own account",
            )

        if user.verification_token_created_at and datetime.now(
            tz=timezone.utc
        ) - user.verification_token_created_at.replace(tzinfo=timezone.utc) < timedelta(minutes=10):
            raise HTTPException(
                status_code=400,
                detail="A verification token was recently sent, please wait before requesting another",
            )

        try:
            await handle_verification_email(user)
            return {"message": "Verification email resent"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    if not body.token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    if (
        user.verification_token is None
        or user.verification_token != body.token
        or await user.has_verification_token_expired()
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid verification token, please login and request a new email",
        )

    await user.update(is_verified=True)

    return {"message": "Email verified successfully"}
