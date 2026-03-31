from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from models import Session, User


class LoginRequest(BaseModel):
    email_address: str
    password: str


router = APIRouter()


@router.post("/login/")
async def login(request: Request, data: LoginRequest):
    if not data.email_address or not data.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # Validate email format
    try:
        checked_email = validate_email(data.email_address, check_deliverability=False)
    except EmailNotValidError as err:
        raise HTTPException(status_code=401, detail="Invalid credentials") from err

    # Check the user exists and has valid credentials
    user = await User.objects.get_or_none(email_address=checked_email.normalized)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not await user.check_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # auth successful
    _, session_key = await Session.create_session(user)

    response = JSONResponse(
        content={
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email_address": user.email_address,
            "is_verified": user.is_verified,
            "is_cso": user.is_cso,
        }
    )

    # Set session token
    request.session["session_token"] = session_key

    return response
