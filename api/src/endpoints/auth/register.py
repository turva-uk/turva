from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from models import User
from argon2 import PasswordHasher
from pydantic import BaseModel
from email_validator import validate_email, EmailNotValidError
from uuid import uuid4
from common.verify_email import handle_verification_email

router = APIRouter()


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


@router.post("/register/")
async def register(request: Request, body: RegisterRequest, background_tasks: BackgroundTasks):
    # Check if user already exists
    existing_user = await User.objects.get_or_none(email_address=body.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    # Validate email format
    try:
        checked_email = validate_email(body.email, check_deliverability=True)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Hash the password
    hashed_password = PasswordHasher().hash(body.password)

    # Create new user
    new_user = await User.objects.create(
        id=uuid4(),
        first_name=body.first_name,
        last_name=body.last_name,
        email_address=checked_email.normalized,
        password=hashed_password,
        is_verified=False,
    )

    # Send verification email
    background_tasks.add_task(handle_verification_email, new_user)

    return {"message": "User registered successfully", "id": new_user.id}
