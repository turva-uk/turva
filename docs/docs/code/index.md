# Code Reference

Unified documentation for Turva's codebase.

## The Django application (`app/`)

Django 6.1 serving server-rendered pages, progressively enhanced with HTMX.
There is no separate frontend build: the application that enforces the rules also
renders the screens, so each one is written once.

- `app/config/` - settings, URLs, WSGI entry point
- `app/accounts/` - users, registration, email verification, authentication
- `app/templates/`, `app/static/` - pages and assets

## The safety file storage layer (`safety_file/`)

A standalone Python package with no web framework dependency. It is the only
code that reads or writes a Clinical Safety Management File, and it enforces the
rules that make one trustworthy: derived risk levels, attributed commits,
identifiers that are never reused.

Keeping it framework-free is deliberate. It is unit-testable without a server,
and it survived the move from FastAPI to Django untouched. See
[ADR 0001](https://github.com/turva-uk/turva/blob/main/specifications/adr/0001-use-django-for-phase-one.md).

## Architecture

- **Interface**: Django templates plus HTMX, vendored rather than loaded from a CDN
- **Application**: Django 6.1, synchronous views - Git and PDF work is blocking
- **Database**: PostgreSQL via psycopg 3, holding users, sessions and an index over the safety files
- **Authentication**: Django sessions in the database, Argon2 password hashing
- **Safety files**: each Clinical Safety Management File is a Git repository on disk, holding a Zensical documentation site
