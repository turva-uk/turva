"""Pytest configuration for the Django test suite.

Tests run against PostgreSQL, not SQLite. The previous FastAPI suite used
SQLite, which is why an asyncpg incompatibility in the PostgreSQL connection
arguments reached main with every test green. Testing against a different engine
than production ships is a false signal.
"""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _never_send_real_email(settings):
    """Force the in-memory mail backend for every test.

    Belt and braces: `app/.env.cicd` already sets it, but a developer running
    the suite with their own `.env` could otherwise send real mail to the
    fictional addresses in the fixtures - or worse, to a real one.

    Overrides MAILERS rather than EMAIL_BACKEND: the two cannot coexist, and
    reading `settings.EMAIL_BACKEND` raises once MAILERS is defined.
    """
    settings.MAILERS = {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}


@pytest.fixture(autouse=True)
def _safety_files_in_tmp(settings, tmp_path):
    """Point safety file storage at a temporary directory.

    No test may write into the real `SAFETY_FILE_ROOT`. Those repositories are
    the system of record, and a test that created or modified one would be
    corrupting production data on a developer's machine.
    """
    root = tmp_path / "safety-files"
    root.mkdir()
    settings.SAFETY_FILE_ROOT = root
    return root
