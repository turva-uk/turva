---
name: in-code-documentation
description: In code documentation
disable-model-invocation: true
---

# In code documentation

## Review all code

- Read through the code base and document as below: `safety_file/`, `app/`
  and `frontend/src/`.
- Leave generated and archived files alone: Django migrations, the
  dependency locks and `specifications/archive/`.
- Change documentation only. Do not alter behaviour while you are there; if
  the code looks wrong, say so and leave it.

## Python

Add / update comprehensive Google-style docstrings to all functions, classes, and methods. For each:

- Summary: Brief description of purpose
- Args: parameter descriptions with types
- Returns: return value description with type
- Raises: any exceptions thrown
- Examples: only for complex functions where usage isn't obvious - use sparingly

Also, add / update summary module documentation at the top of the module.

The docs site renders these docstrings: `docs/mkdocs.yml` sets mkdocstrings
to the Google style, and the Code Reference pages are built from the
docstrings in `safety_file/`. A docstring there is published, so write it
for a reader who has not seen the code.

## TypeScript

Add / update comprehensive TSDoc comments to all functions, classes, and methods. For each:

- Summary: Brief description of purpose
- @param: parameter descriptions (types inferred from TypeScript)
- @returns: return value description (type inferred from TypeScript)
- @throws: any exceptions thrown
- @example: only for complex functions where usage isn't obvious - use sparingly

Also, add / update summary module documentation at the top of the module.

## React Components

Follow the TypeScript standards above. Additionally:

- Add component-level TSDoc describing the component's purpose
- Document all props in the Props/interface definition
- Add usage examples in TSDoc only for complex components

## Storybook Stories

Stories are self-documenting through their structure. Ensure:

- Each story file has a clear `title` in the meta export
- All argTypes have clear `description` fields
- Story names clearly describe what they demonstrate
- Longer prose about a component goes in a sibling `.mdx` guide, as
  `.claude/rules/components.md` sets out, not in a description on the meta
- Do NOT add TSDoc comments to individual story objects

## Tests

Tests should be self-documenting through descriptive names and clear structure. Only document:

- Test utilities and helper functions (using same standards as above)
- Test data factories and fixtures
- Complex test setup that isn't obvious from the code
- Shared test configuration

Individual test cases should not have documentation comments - use descriptive test names instead.
