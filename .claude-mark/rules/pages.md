---
paths:
  - "frontend/src/pages/**"
---

# Page conventions

- Pages must **only use components from `components/`** (the Storybook catalogue). Do not place reusable UI inline in pages.
- If a page needs a component that does not exist in `components/`, build a new Storybook component first following the rules in `.claude/rules/components.md`, then use it in the page.
- **Right-justify all buttons** - wrap buttons in `<Group justify="flex-end">` so they align to the right of their container.
- **Never use `clearable` on SelectField** - do not add the clear (X) button to select inputs. If a field is optional, use placeholder text to indicate this.

<!-- cspell:words clearable -->
