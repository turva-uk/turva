"""Django settings for Turva.

Configuration comes from the environment, with no defaults for anything whose
wrong value would be unsafe: `SECRET_KEY` and the database credentials have no
fallback, so a misconfigured deployment fails at startup rather than running with
a predictable signing key.

The parse helpers reject malformed values rather than silently defaulting, which
is the same discipline the previous FastAPI `config.py` applied and is worth
keeping: a `DEBUG=yes` that quietly evaluates to False is a production incident.
"""

from __future__ import annotations

import os
from pathlib import Path

# BASE_DIR is the repository root: settings.py is app/config/settings.py, so
# three parents up. `safety_file` and `safety-file-templates` are siblings of
# `app` beneath it.
BASE_DIR = Path(__file__).resolve().parents[2]


class ConfigurationError(Exception):
    """Raised when an environment variable is missing or malformed."""


def env_str(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        raise ConfigurationError(f"Missing required environment variable {name}")
    return value


def env_int(name: str, default: int | None = None) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        if default is None:
            raise ConfigurationError(f"Missing required integer environment variable {name}")
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be an integer, got {raw!r}") from exc


def env_bool(name: str, default: bool | None = None) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        if default is None:
            raise ConfigurationError(f"Missing required boolean environment variable {name}")
        return default
    lowered = raw.strip().lower()
    if lowered in {"true", "1", "yes", "on"}:
        return True
    if lowered in {"false", "0", "no", "off"}:
        return False
    raise ConfigurationError(
        f"{name} must be a boolean, got {raw!r}. Accepted: true/false, 1/0, yes/no, on/off"
    )


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# --------------------------------------------------------------------- core

SECRET_KEY = env_str("SECRET_KEY")
DEBUG = env_bool("DEBUG", False)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

# Caddy terminates TLS and proxies to this application, so Django must be told
# that the original request was HTTPS or it will build http:// URLs and reject
# cross-origin POSTs that it should accept.
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "https://localhost,http://localhost")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_htmx",
    "app.accounts",
    "app.safetyfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_htmx.middleware.HtmxMiddleware",
]

ROOT_URLCONF = "app.config.urls"
WSGI_APPLICATION = "app.config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "app" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ----------------------------------------------------------------- database

# PostgreSQL only. SQLite is not offered even for tests: the previous
# FastAPI test suite ran on SQLite, which meant a PostgreSQL connection
# regression reached main with every test passing. Tests run against the real
# engine now.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": env_str("DB_HOST"),
        "PORT": env_int("DB_PORT", 5432),
        "USER": env_str("DB_USER"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "NAME": env_str("DB_DATABASE"),
        "OPTIONS": {
            # Schema isolation, carried over from the previous implementation.
            "options": f"-c search_path={env_str('DB_SCHEMA', 'public')}",
        },
        "TEST": {"NAME": env_str("DB_TEST_DATABASE", "turva_test")},
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------- auth

AUTH_USER_MODEL = "accounts.User"

# Sessions live in PostgreSQL, validated by Django's own middleware. This
# replaces the hand-written session table and authentication backend, which did
# the same job with more code.
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = env_str("SESSION_COOKIE_NAME", "turva_session")
SESSION_COOKIE_AGE = env_int("SESSION_COOKIE_LIFETIME", 86400)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
# Sliding expiry, matching the previous behaviour of extending the session on
# every authenticated request.
SESSION_SAVE_EVERY_REQUEST = True

SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)

LOGIN_URL = "accounts:login"
LOGIN_REDIRECT_URL = "safetyfiles:list"
LOGOUT_REDIRECT_URL = "accounts:login"

# Argon2 first, so new and rehashed passwords use it.
#
# The previous implementation called argon2-cffi directly, producing bare
# `$argon2id$...` hashes. Django prefixes its own with `argon2$`, so those older
# hashes are *not* verifiable by Django without migration. No migration is
# written because Turva is pre-release and has no users: the development
# database held zero rows. If that ever stops being true, this needs a data
# migration before deploying, not a comment.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------- internationalisation

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

# -------------------------------------------------------------------- static

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "app" / "static"]

# The manifest storage gives cache-busting hashed filenames, but it *requires*
# `collectstatic` to have run: without the manifest, every `{% static %}` call
# raises. That is right for deployment, where the Dockerfile runs collectstatic
# at build time, and wrong for development, where it would mean rebuilding the
# image after every CSS edit.
#
# CI runs with DEBUG=false and runs collectstatic first, so the manifest path is
# exercised rather than only existing in production.
if DEBUG:
    _staticfiles_backend = "django.contrib.staticfiles.storage.StaticFilesStorage"
else:
    _staticfiles_backend = "whitenoise.storage.CompressedManifestStaticFilesStorage"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": _staticfiles_backend},
}

# --------------------------------------------------------------------- email

# `MAILERS` rather than the `EMAIL_*` settings. Django 6.1 deprecated the latter
# and removes them in 7.0, and the two cannot coexist: defining MAILERS makes
# `settings.EMAIL_BACKEND` raise. Writing new configuration on a deprecation
# path would mean doing this twice.
_mailer_backend = env_str("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")

# OPTIONS are passed as keyword arguments to the backend, and the non-SMTP
# backends reject options they do not recognise - locmem raises
# "Unknown options 'host', 'port'". So the SMTP options are only supplied when
# an SMTP backend is actually in use, which lets the console backend be selected
# in development and locmem in tests without stripping the rest of the config.
_mailer_options: dict[str, object] = {}
if _mailer_backend.endswith("smtp.EmailBackend"):
    _mailer_options = {
        "host": env_str("SMTP_HOST", "localhost"),
        "port": env_int("SMTP_PORT", 25),
        "username": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "use_tls": env_bool("SMTP_USE_TLS", False),
    }

MAILERS = {"default": {"BACKEND": _mailer_backend, "OPTIONS": _mailer_options}}

# Not deprecated, and still read by the password reset views.
DEFAULT_FROM_EMAIL = env_str("SMTP_FROM_ADDRESS", "noreply@turva.org")

#: Used to build absolute links in emails, where there is no request to derive
#: them from.
SITE_BASE_URL = env_str("SITE_BASE_URL", "http://localhost")

# ---------------------------------------------------------------- safety files

#: Where Clinical Safety Management File repositories live. In deployment this is
#: a mounted volume on the VPS; locally it is a gitignored directory. These
#: repositories are the system of record - see
#: specifications/architecture-principles.md.
SAFETY_FILE_ROOT = Path(env_str("SAFETY_FILE_ROOT", str(BASE_DIR / ".turva-data" / "safety-files")))

#: Templates a new safety file is scaffolded from.
SAFETY_FILE_TEMPLATE_ROOT = BASE_DIR / "safety-file-templates"

# -------------------------------------------------------------------- logging

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": env_str("LOG_LEVEL", "INFO")},
}

# --------------------------------------------------------- production hardening

if not DEBUG:
    SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Caddy already redirects HTTP to HTTPS, so this is belt and braces. It is
    # on by default rather than off because the safe failure mode is a
    # redundant redirect, not a page served in clear.
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    X_FRAME_OPTIONS = "DENY"
