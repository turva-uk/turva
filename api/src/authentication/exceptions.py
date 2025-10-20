from starlette.exceptions import HTTPException


class UserNotAuthenticatedException(HTTPException):
    """
    Raised when a user has not authenticated, however attempts to
    access an area limited to authenticated users
    """

    def __init__(self):
        super().__init__(status_code=401, detail="User not authenticated")


class UserNotValidatedException(HTTPException):
    """
    Raised when a user has not validated their account, however attempts to
    access an area limited to validated users
    """

    def __init__(self):
        super().__init__(status_code=403, detail="User not validated")
