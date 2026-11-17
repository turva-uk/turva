---
paths:
  - "frontend/src/pages/**"
---

# Page conventions

- Pages must **only use components from `components/`** (the Storybook
  catalogue). Do not place reusable UI inline in pages.
- If a page needs a component that does not exist in `components/`,
  build a new Storybook component first, following
  `.claude-personal/mark/rules/components.md`, then use it in the page.
- **Turva's existing pages are moving across one view at a time.** Until
  a view moves, it keeps Mantine's own components and `@mantine/form`,
  and the app renders it with `src/legacyTheme.ts`. A page that moves
  takes the shared components and their `react-hook-form` fields. Do not
  restyle an existing page piecemeal on the way.
- **A safety page fetches through `@/lib/safety`**, never with a bare
  `fetch` or a path written by hand, and hands the components what it
  read. Every write passes the `head_sha` the page read, as
  `expected_head`, and a 409 (`isConflict`) means somebody saved first:
  keep the draft and say so.
- **A page never works out a risk level** (TH-008). It shows the levels
  the server sent, and a form shows the ones `previewAssessment` returns.
- **Right-justify all buttons** - wrap buttons in
  `<Group justify="flex-end">` so they align to the right of their
  container.
- **Never use `clearable` on SelectField** - do not add the clear (X)
  button to select inputs. If a field is optional, use placeholder text
  to indicate this.

<!-- cspell:words clearable -->
