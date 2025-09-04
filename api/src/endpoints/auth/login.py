from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from models import User, Session

class LoginRequest(BaseModel):
    email_address: str
    password: str

router = APIRouter()

@router.post("/login/")
async def login(data: LoginRequest):
    if not data.email_address or not data.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # Check the user exists and has valid credentials
    user = await User.objects.get_or_none(email_address=data.email_address)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not await user.authenticate(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # auth successful
    session = await Session.create_session(user)

    response = JSONResponse(
        content={
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email_address": user.email_address,
        }
    )

    # Set session token in response cookies if needed
    response.set_cookie(key="session_token", value=session.token, httponly=True, secure=True)
    
    # If authentication is successful, you would typically create a session or token
    return response
