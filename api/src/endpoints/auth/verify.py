from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from models import User

router = APIRouter()


class VerifyRequest(BaseModel):
    token: str


@router.post("/verify/{user_id}/")
async def verify_email(request: Request, body: VerifyRequest, user_id: str):
    """
    Verify a user's email address using a token.

    If the token is valid, the user's email will be marked as verified.
    If the token is invalid, an error will be returned.

    Params:
        - user_id: str - The ID of the user to verify.
        - body: VerifyRequest - The request body containing the verification token.

    Returns:
        - JSON response indicating success or failure of the verification process.

    Raises:
        - HTTPException with status code 404 if the user is not found.
        - HTTPException with status code 400 if the user is already verified,
            the token is invalid, or the token has expired.
    """

    user = await User.objects.get_or_none(id=UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "User is already verified"}

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
