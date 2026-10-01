# Code Reference

Unified documentation for Turva's codebase.

## Backend (Python)

FastAPI application with async PostgreSQL database. The API serves both the HTML interface (server-rendered Jinja2 templates with HTMX) and the JSON API.

[Browse Backend Documentation →](api/index.md)

## Architecture

- **Interface**: Server-rendered Jinja2 templates, progressively enhanced with HTMX
- **Backend**: FastAPI + Ormar ORM + PostgreSQL
- **Authentication**: Session-based with Argon2 password hashing
- **Safety files**: Each Clinical Safety Management File is a Git repository on disk, holding a Zensical documentation site
