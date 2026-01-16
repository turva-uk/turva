# Code Reference

Unified documentation for Turva's codebase.

## Frontend (TypeScript)

React application built with TypeScript, Vite, and Mantine UI.

[Browse Frontend Documentation →](frontend/README.md)

## Backend (Python)

FastAPI application with async PostgreSQL database.

[Browse Backend Documentation →](api/index.md)

## Architecture

The frontend and backend communicate via REST API with automatic case conversion (camelCase ↔ snake_case).

- **Frontend**: React 19 + TypeScript + Mantine UI
- **Backend**: FastAPI + Ormar ORM + PostgreSQL
- **Authentication**: Session-based with Argon2 password hashing
