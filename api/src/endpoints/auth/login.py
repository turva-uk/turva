from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import Config
from models import Session, User


class LoginRequest(BaseModel):
    email_address: str
    password: str


router = APIRouter()


@router.post("/login/")
async def login(data: LoginRequest):
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
    session, signed_session_key = await Session.create_session(user)

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

    # Set session token in response cookies
    response.set_cookie(
        key=Config.Application.session_cookie_name,
        value=signed_session_key,
        httponly=True,
        secure=True,
    )

    return response
