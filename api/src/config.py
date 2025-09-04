import os
from typing import Literal, overload


class ConfigurationError(Exception):
    """Raised when a configuration error occurs"""


@overload
def parseInteger(env_var: str, required: Literal[True]) -> int: ...


@overload
def parseInteger(env_var: str, required: Literal[False]) -> int | None: ...


def parseInteger(env_var: str, required: bool) -> int | None:
    value = os.getenv(env_var)
    if value is None:
        if required is True:
            raise ConfigurationError(
                f"Missing required integer value for key {env_var}"
            )
        else:
            return None

    try:
        return int(value)
    except ValueError:
        raise ConfigurationError(f"Invalid integer value: {value} for key {env_var}")


@overload
def parseString(env_var: str, required: Literal[True]) -> str: ...


@overload
def parseString(env_var: str, required: Literal[False]) -> str | None: ...


def parseString(env_var: str, required: bool) -> str | None:
    value = os.getenv(env_var)
    if value is None:
        if required is True:
            raise ConfigurationError(f"Missing required string value for key {env_var}")
        else:
            return None
    return str(value)


@overload
def parseBoolean(env_var: str, required: Literal[True]) -> bool: ...


@overload
def parseBoolean(env_var: str, required: Literal[False]) -> bool | None: ...


def parseBoolean(env_var: str, required: bool) -> bool | None:
    value = os.getenv(env_var)
    if value is None:
        if required is True:
            raise ConfigurationError(
                f"Missing required boolean value for key {env_var}"
            )
        else:
            return None

    if value.lower() == "true":
        return True
    elif value.lower() == "false":
        return False
    else:
        raise ConfigurationError(f"Invalid boolean value: {value} for key {env_var}")


class Config:
    class Database:
        host: str = parseString("DB_HOST", True)
        port: int | None = parseInteger("DB_PORT", False)
        user: str = parseString("DB_USER", True)
        password: str | None = parseString("DB_PASSWORD", False)
        database: str = parseString("DB_DATABASE", True)
        schema: str | None = parseString("DB_SCHEMA", True)

    class Application:
        secret_key: str = parseString("SECRET_KEY", True)
        is_debug_environment: bool | None = parseBoolean("DEBUG", False)
        is_testing_environment: bool | None = parseBoolean("TESTING", False)
        session_cookie_name: str = parseString("SESSION_COOKIE_NAME", True)
        session_cookie_lifetime: int = parseInteger("SESSION_COOKIE_LIFETIME", True)
