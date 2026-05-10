# Documentation Architecture

Turva's documentation system unifies API reference, component library, architectural decisions, and user guides in a single searchable site. This document describes the documentation strategy without prescribing specific tools.

## Documentation Goals

1. **Single Source of Truth**: All documentation in one place
2. **Always Up-to-Date**: Generated from code, not manually maintained
3. **Discoverable**: Search across all docs
4. **Accessible**: Multiple formats (web, PDF when needed)
5. **Developer-Friendly**: Easy to contribute

## Documentation Types

### API Reference

**TypeScript/React**: TypeDoc generates markdown from TSDoc comments.

**Python**: mkdocstrings generates API docs from Python docstrings.

**Why generate from code?** Documentation drifts from code when maintained separately. Generated docs stay synchronized.

### Component Library

**Storybook**: Interactive component showcase with live examples.

**Why Storybook?** Visual testing, isolated component development, and documentation in one tool.

### Architecture Documentation

**Markdown files**: Human-written documents describing design decisions, patterns, and rationale.

**Location**: `docs/docs/specifications/architecture/`

**Why markdown?** Version-controlled, diff-able, works with any editor.

### Specifications and Requirements

**VMPT Stack**: Version control + Markdown + Placeholders + Templates

Clinical safety case templates in `example_template/`. See [VMPT Architecture](vmpt.md) for details.

## Documentation Build Process

### Development

Local docs server serves live-reloading documentation:

```bash
just docs  # Builds TypeDoc, Storybook, serves MkDocs on :8001
```

### Production

CI/CD pipeline:

1. Build TypeDoc (frontend API reference)
2. Build Storybook (component library)
3. Build MkDocs (unified site)
4. Deploy to GitHub Pages

## Technology Choices

### MkDocs Material

**Why MkDocs?**

- **Python-native**: Fits backend tooling
- **Material theme**: Modern, accessible, mobile-friendly
- **Powerful plugins**: Code highlighting, search, navigation
- **Markdown-based**: Simple authoring

**Alternatives**: Docusaurus, VitePress, Nextra all valid choices.

### TypeDoc

**Why TypeDoc?**

- **TypeScript-first**: Built for TypeScript projects
- **Plugin ecosystem**: typedoc-plugin-markdown generates MkDocs-compatible output
- **Type-aware**: Links types across modules

**Alternatives**: TypeDoc alternatives (TSDoc, documentation.js) less mature.

### Storybook

**Why Storybook?**

- **Industry standard**: Widely adopted, lots of integrations
- **Component isolation**: Test components without full app
- **Accessibility testing**: Built-in a11y addon
- **Visual regression**: Chromatic integration

**Alternatives**: React Styleguidist, Docz less actively developed.

## Documentation Principles

### Close to Code

Documentation lives near the code it documents:

- TSDoc comments in source files
- Storybook stories next to components
- Architecture docs in `docs/` at repo root

### Progressive Disclosure

- **Quickstart**: Get running in 5 minutes
- **Tutorials**: Learn by building
- **How-to guides**: Solve specific problems
- **Reference**: Complete API documentation
- **Explanation**: Design rationale and architecture

This follows the [Diátaxis framework](https://diataxis.fr/).

### Searchable

MkDocs includes search across all content. Users shouldn't need to know where something is documented.

### Versioned

Documentation is version-controlled with code. Historical docs remain accessible.

## Contribution Workflow

### Adding API Documentation

**TypeScript**: Add TSDoc comments above functions/classes.

**Python**: Add docstrings following Google or NumPy style.

Docs generate automatically on next build.

### Adding Component Stories

1. Create `.stories.tsx` file next to component
2. Define stories for different component states
3. Run `yarn storybook` to view locally
4. Stories included in docs automatically

### Adding Architecture Documents

1. Create markdown file in `docs/docs/specifications/architecture/`
2. Add to `mkdocs.yml` navigation
3. Commit with code changes

### Adding Specifications

VMPT templates in `example_template/` define clinical safety case structure. See [VMPT documentation](vmpt.md).

## Documentation CI/CD

### On Pull Requests

- Build docs to check for errors
- No deployment

### On Main Branch

- Build TypeDoc, Storybook, MkDocs
- Deploy to GitHub Pages
- Accessible at project URL

### Why GitHub Pages?

Free, automatic HTTPS, supports custom domains, integrates with GitHub Actions.

**Alternatives**: Netlify, Vercel, Read the Docs all valid.

## Documentation Maintenance

### Keeping Docs Fresh

- **API docs**: Auto-generated, always current
- **Component stories**: Created alongside components
- **Architecture docs**: Reviewed during code review
- **Specifications**: Updated when requirements change

### Identifying Stale Documentation

- Link checkers catch broken links
- CI fails if TypeDoc/Storybook build fails
- Manual review during architecture changes

### Documentation Debt

Like technical debt, documentation debt accumulates. Regular reviews and updates prevent drift.

## Accessibility

All documentation must be:

- **Screen reader friendly**: Proper heading structure, alt text for images
- **Keyboard navigable**: No mouse required
- **High contrast**: Readable in light and dark modes
- **Zoomed**: Layout adapts to 200% zoom

## Related Documentation

- [Architecture Overview](index.md)
- [VMPT Stack](vmpt.md)
- [Frontend Architecture](frontend.md)
- [Backend Architecture](backend.md)
