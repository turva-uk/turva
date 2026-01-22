# Architecture Overview

Turva is a **clinical safety management platform** built as a modern web application. The system digitizes clinical risk management for healthcare IT systems, replacing spreadsheet-based workflows with structured, auditable, and transparent safety management.

## High-Level Architecture

```text
User Browser
     ↓
   Reverse Proxy
     ↓
     ├─→ /api/* → Backend API
     │              ↓
     │         Database
     │
     └─→ /*     → Frontend SPA
```

## Core Technologies

The current implementation uses:

- **Frontend**: React 19 + TypeScript + Vite + Mantine UI
- **Backend**: FastAPI (Python) + async ORM + PostgreSQL
- **Infrastructure**: Caddy reverse proxy + Docker Compose
- **Clinical Safety**: VMPT Stack (Version control, Markdown, Placeholders, Templates)
- **Documentation**: MkDocs + TypeDoc + Storybook

These are implementation choices, not requirements. The architecture supports alternative technologies that meet the same principles.

[Frontend Details →](frontend.md) | [Backend Details →](backend.md) | [VMPT Stack →](vmpt.md)

## Design Principles

### 1. Safety as a First-Class Concern

Safety information is structured, persistent, and auditable. Every change is tracked, attributed, and immutable. This is non-negotiable for clinical safety applications.

### 2. Auditability by Default

All safety-related actions must have:

- Complete version history
- Named user attribution
- Timestamps
- Immutable records

Implementation method is flexible (Git, database audit tables, event sourcing, etc.).

### 3. Separation of Concerns

Frontend, backend, and infrastructure are logically separated. This enables:

- Independent scaling
- Technology flexibility
- Clear boundaries
- Easier testing

### 4. Type Safety

Use type systems where available to catch errors early. The specific approach (TypeScript, Python type hints, GraphQL schemas, etc.) is less important than the principle.

### 5. Developer Experience

Prioritize fast feedback loops:

- Quick local development setup
- Fast test execution
- Clear error messages
- Good documentation

## Architecture Decisions

### Session-Based Authentication

Turva uses session-based authentication (not stateless tokens like JWT). This provides:

- Server-side session revocation
- Reduced client-side attack surface
- Simplified security model for clinical applications
- Complete audit trail of active sessions

Alternative approaches (JWT, OAuth, SAML) are possible if they meet security and auditability requirements.

### Async Database Operations

Database operations use async/await patterns for better performance under load. This is important for scalability but not mandatory if synchronous operations meet performance requirements.

### API Endpoint Organization

Backend endpoints are organized by feature/domain. The current implementation uses file-tree-based auto-discovery, but manual registration or other conventions are equally valid.

### Containerization

Development and deployment use containers for consistency. The specific orchestration (Docker Compose, Kubernetes, etc.) depends on deployment scale and requirements.

## Data Flow Patterns

### User Request Flow

1. User interacts with frontend (browser)
2. Frontend sends API request
3. Reverse proxy routes to backend
4. Backend validates request
5. Backend queries database
6. Response returned to frontend
7. Frontend updates UI

### Safety Case Creation Flow

1. Clinical Safety Officer creates hazard record
2. System stores structured data with version control
3. Audit trail entry created automatically
4. Safety case report generated from data
5. Template engine populates documentation

## Security Considerations

Security is implemented in layers:

1. **Network**: TLS encryption, reverse proxy
2. **Authentication**: Secure session management
3. **Authorization**: Role-based access control
4. **Input Validation**: All inputs validated before processing
5. **Database**: Parameterized queries, no raw SQL
6. **Sessions**: Secure cookies, proper expiration

Specific implementations vary but must meet healthcare security standards.

## Scalability

The architecture supports scaling through:

- **Horizontal scaling**: Stateless API servers
- **Database scaling**: Read replicas, connection pooling
- **Caching**: Session caching, query result caching
- **CDN**: Static asset distribution

Scale as needed based on actual usage patterns.

## Testing Strategy

Testing occurs at multiple levels:

- **Unit tests**: Test individual functions/components
- **Integration tests**: Test API endpoints and database interactions
- **E2E tests**: Test complete user workflows
- **Component tests**: Test UI components in isolation

The specific frameworks matter less than test coverage and quality.

## Related Documentation

- [Frontend Architecture](frontend.md) - React, TypeScript, and UI patterns
- [Backend Architecture](backend.md) - API, database, and business logic
- [Reverse Proxy (Caddy)](caddy.md) - Request routing and TLS
- [VMPT Stack](vmpt.md) - Clinical safety documentation
- [Documentation System](documentation.md) - MkDocs, TypeDoc, and Storybook
