from enum import Enum


class Scope(Enum):
    AUTHENTICATED = "authenticated"  # Any authenticated user
    VERIFIED = "verified"  # User with verified email
