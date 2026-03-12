# Frontend Architecture

Turva's frontend is a React application emphasizing type safety, developer experience, and clinical safety workflows. This document describes architectural patterns without prescribing specific implementations.

## Core Technologies

- **React 19 + TypeScript**: Component-based UI with strict type checking
- **Vite**: Fast development server with HMR
- **Mantine UI**: Accessible component library (alternative: Chakra, MUI, Ant Design, shadcn/ui)

## Architectural Patterns

### Component Architecture

**Composition over inheritance**: Components are small, focused, and composable. Pages assemble components rather than building monolithic views.

**Type safety**: All props, state, and API responses are typed. TypeScript's strict mode catches errors at compile time.

**Accessibility**: Components follow ARIA standards and keyboard navigation patterns.

### API Communication

Frontend communicates with the backend REST API using:

- **Automatic case conversion**: `snake_case` (backend) ↔ `camelCase` (frontend)
- **Date handling**: ISO strings automatically parsed to Date objects
- **Error handling**: Structured error responses with user-friendly messages
- **Session-based auth**: Cookies, not JWT

**Pattern**: A wrapper around `fetch()` handles these transformations transparently. Alternative patterns (Axios, React Query, tRPC) can provide similar functionality.

### State Management

**React Context**: User authentication, configuration, and user groups stored in contexts.

**Local storage**: User session persisted across page reloads.

**URL state**: Filters, pagination, and search parameters live in the URL for shareability.

**Why not Redux/Zustand/MobX?** The application's state management needs are currently simple. Complex state libraries add overhead. Context + hooks suffice. This may change as the application grows.

### Routing

**Client-side routing**: React Router handles navigation without server round-trips.

**Route guards**: Protected routes check authentication and verification status before rendering.

**Nested layouts**: Authentication pages share one layout, dashboard pages share another.

### Forms and Validation

**Controlled components**: Form state lives in React, not the DOM.

**Client-side validation**: Reduce server round-trips and provide immediate feedback.

**Server-side validation**: Never trust client input - backend validates everything.

**Accessibility**: Labels, error messages, and focus management for screen readers.

### Styling

**CSS Modules or Mantine's styling system**: Component-scoped styles prevent conflicts.

**Design tokens**: Colors, spacing, typography defined once and reused.

**Responsive design**: Mobile-first, adapts to different screen sizes.

### Error Handling

**Error boundaries**: Catch rendering errors and display fallback UI.

**API errors**: Structured error responses displayed with context.

**Unauthenticated errors**: Redirect to login when session expires.

## Key Design Decisions

### Why Session-Based Auth (Not JWT)?

- **Stateful sessions**: Server tracks active sessions in database
- **Revocable**: Can invalidate sessions immediately
- **Secure**: HttpOnly cookies prevent XSS attacks
- **Simple**: No token refresh logic

JWTs are valid for SPAs, but sessions fit Turva's security requirements better.

### Why Automatic Case Conversion?

Python uses `snake_case`, JavaScript uses `camelCase`. Manual conversion is error-prone. Automatic conversion at the API boundary keeps code idiomatic in both languages.

### Why Mantine Over Other UI Libraries?

- **Comprehensive**: 100+ components cover most needs
- **Accessible**: WCAG 2.1 AA compliant out of the box
- **Customizable**: Theme system and unstyled variants
- **TypeScript-first**: Written in TypeScript with excellent types

Alternatives (Chakra, MUI, Ant Design) are equally valid choices.

### Why React Router v7?

- **Client-side routing**: No server round-trips
- **Data loading**: Loaders fetch data before rendering
- **Nested routes**: Layout composition without prop drilling

Alternative routers (TanStack Router, Wouter) can provide similar features.

## Development Workflows

### Hot Module Replacement

Vite provides instant feedback: edit a component, see changes in <500ms without losing application state.

### Type Checking

TypeScript runs in VS Code and during build. Catches type errors before runtime.

### Testing

**Unit tests**: Vitest tests components in isolation

**Integration tests**: Testing Library verifies user interactions

**E2E tests**: Playwright simulates real browser usage

### Storybook

Component library documents all UI components with interactive examples. Runs independently of the main application.

## Clinical Safety Considerations

### Audit Trails

All user actions (creating hazards, accepting risks) include:

- Who performed the action
- When it happened
- What changed

This data comes from the backend, not the frontend.

### Data Integrity

Forms validate input, but the backend enforces constraints. The frontend is untrusted.

### Accessibility

Clinical Safety Officers may have visual or motor impairments. The UI must support:

- Screen readers (ARIA labels, semantic HTML)
- Keyboard navigation (no mouse required)
- High contrast mode
- Zoom without breaking layout

## Extension Points

### Adding New Pages

1. Create component in `src/pages/`
2. Add route to router configuration
3. Add navigation link if needed

### Adding New API Endpoints

1. Update TypeScript types
2. Use existing fetch wrapper (case conversion automatic)
3. Add loading/error states

### Custom Components

Extend Mantine components or build from scratch. Keep them composable and typed.

## Related Documentation

- [Architecture Overview](index.md)
- [Backend Architecture](backend.md)
- [VMPT Stack](vmpt.md)
- [Authentication](authentication.md) (when created)
