from functools import wraps
from inspect import signature
from typing import Callable
from fastapi.requests import HTTPConnection
from starlette.authentication import UnauthenticatedUser
from .exceptions import UserNotAuthenticatedException, UserNotValidatedException
from models import User


def needsValidatedUser(fn: Callable) -> Callable:
    sig = signature(fn)
    request_index = None

    # This is basically finding the parameter called request in the function
    # the decorator is attached to
    for index, param in enumerate(sig.parameters.values()):
        if param.name == "request":
            request_index = index

    @wraps(fn)
    async def wrapper(*args, **kwargs):
        if request_index is None:
            raise TypeError(f"Function {fn.__name__} does not have a request parameter.")

        request: HTTPConnection = args[request_index]

        if isinstance(request.user, UnauthenticatedUser):
            raise UserNotAuthenticatedException()

        user: User = request.user
        if user.is_verified is False:
            raise UserNotValidatedException()

        return fn(*args, **kwargs)

    return wrapper
