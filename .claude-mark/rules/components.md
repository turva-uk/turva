---
paths:
  - "frontend/src/components/**"
---

# Component conventions

- **Reuse existing components** from this `components/` folder. Always check what already exists before creating anything new.
- Use **typography components** from `components/typography/` for **all** text - Never use raw Mantine `<Text>`, `<Title>`, or plain HTML text elements. If none of the existing typography components fit, ask a human before creating a new one.
- Use **`<PageHeader>`** for the page title, and only for that: every page has exactly one, visible and at one size, and it is the page's only `h1` and its browser-tab title. Section headings within a page use **`<Heading>`**, always an `h2`.
- Use the **`<BaseCard>`** component from `components/base-card/BaseCard.tsx` for **all** cards - never use Mantine's `<Card>` directly. BaseCard enforces consistent `shadow="sm"`, `padding="lg"`, `radius="md"`, and `withBorder`. These props are fixed and cannot be overridden.
- Use the **`<Icon>`** component from `components/icons/Icon.tsx` to wrap **all** Tabler icons - never render Tabler icons directly in JSX (e.g. `<IconPencil />` on its own is not allowed). Always use `<Icon icon={<IconPencil />} />`. Register any new icons in `components/icons/appIcons.tsx` first.
- If you need a new component that does not have existing atomic components to compose from, **stop and ask a human for help** - do not create new atomic components on your own.
- Every new component must have a `.stories.tsx` and `.test.tsx` file alongside it.

## Language and text

- **British English** for all UI text, comments, and code identifiers (e.g. `colour` not `color` in our own props). Exceptions: external APIs, libraries, CSS properties, HTTP headers.
- **No em dashes (—)** in UI text, comments or stories. Use a comma, colon, full stop or brackets, or a spaced hyphen ( - ). No en dashes either.
- **Sentence case** for all UI labels, buttons, and headings (e.g. "Add new user", not "Add New User"). Exceptions: product names, acronyms, proper nouns.

## Styling

- **No inline styles** - use Mantine component props or CSS modules only.
- **Use `rem` instead of `px`** in CSS modules for component dimensions (padding, margins, widths, font-sizes). Breakpoints use `em` via the theme - don't hardcode those.
- **Responsive**: always use `theme.breakpoints.sm` (`40em` / 640px) for mobile/desktop splits via `useMediaQuery`. Exceptions: two-column ActionCard grids use `actionCardTwoColumnMinWidth` (`60rem`) from the theme's `layoutTokens`, and the side navigation folds away below `md` through `useNavCollapsed()` in `components/layouts/`.
- **Button layout**:
  - Use `ButtonPair` / `ButtonPairRed` for action pairs (submit/cancel, confirm/dismiss) - they handle right-alignment on desktop and full-width stacking on mobile automatically.
  - For standalone buttons, wrap in `<Group justify="flex-end">` to right-align.
  - Page-header actions (`AddButton`, or any button or badge beside the title) go in `PageHeader`'s `action` prop, never in a hand-built `<Group justify="space-between">`. `PageHeader` keeps the action on the right, including when a narrow screen wraps it under the title, which a `space-between` group does not. Pass `actionAlign="center"` for something shorter than the title, such as a badge. Actions stay fixed-width at all viewports.
  - A table's own action (an "Add" or "Grant" button that acts on that table) goes in `DataTableControlled`'s `action` prop, which puts it in the row with search and filter, before them. The row wraps on a narrow screen and stays right-aligned.
- **A disabled control keeps the ordinary pointer.** Never give one
  `cursor: not-allowed`, the "no entry" sign: not a button, an input, a
  checkbox, a radio, a switch, an option in a list, a tab or anything
  else. A control here is disabled far more often because something is
  under way or already done (a save in progress, a list still loading)
  than because somebody may not use it, and the sign reads as a refusal.
  The greyed-out look already says it will not act.
  `src/styles/disabled-controls.css` overrides Mantine's default for
  every Mantine control, by state, and is loaded by the app and by
  Storybook. A component that styles its own disabled state sets
  `cursor: "default"`. Something in progress is better shown with a
  button's `loading` state than by disabling it.

## Colours

- **All colours must come from the design system** - never use hardcoded colour values (e.g. `black`, `#333`, `rgb(...)`) in components or CSS modules.
- **Never use Mantine's built-in colour names directly** (e.g. `"red"`, `"green"`, `"blue"`, `"teal"`, `"orange"`, `"yellow"`, `"violet"`, `"pink"`, `"cyan"`) as `color` prop values. Use CSS variables from the design system instead: `var(--alert-color)`, `var(--success-color)`, `var(--warning-color)`, `var(--info-color)`, `var(--neutral-color)`, `var(--accent-color)`, `var(--outstanding-color)`.
- **Never use Mantine's built-in colour scales directly** (e.g. `dark.4`, `blue.6`, `red.5`, `--mantine-color-dark-4`, `--mantine-color-blue-6`) - they are not part of our design system. Only use our defined tokens: `primary`, `secondary`, `gray`, and semantic/status colours from the imports below.
- **Brand colours**: import `brandColours` from `@/theme`.
- **Colour scales**: import `primaryScale`, `secondaryScale`, `greyScale` from `@/theme`.
- **Status/semantic colours**: import from `@/styles/semanticColours` (e.g. `statusColours`, `textColours`).
- **Badge colours**: import from `components/badge/badgeColours.ts`.
- **In CSS modules**: use Mantine CSS variables (e.g. `var(--mantine-color-text)`, `var(--mantine-color-primary-6)`, `var(--mantine-color-gray-0)`) - never raw colour literals.
- **In TSX**: use Mantine colour tokens (e.g. `c="primary.7"`, `c="gray.4"`) or imports from the above modules.
- **Dark mode borders**: all form field inputs must use `var(--mantine-color-primary-9)` for border colour in dark mode via `[data-mantine-color-scheme="dark"]` selectors in CSS modules. Exception: error state uses `var(--error-color)` (with `var(--error-focus-color)` on focus) via `[data-error]` selectors.

## Accessibility

- **Every story must pass the Storybook accessibility checks**, in light and in dark mode. They run axe against WCAG 2.2 AA in CI and fail it on any violation.
- **Icon-only buttons are `IconButton`, and images are `Image`.** Both require an accessible name (`aria-label`, `alt`) at compile time. Importing Mantine's `ActionIcon` directly is a lint warning; the few wrappers that size their own are listed as exceptions in `eslint.config.js`.
- **A wait is `BrandSpinner` or `PageSpinner`**, from `components/loading-spinner/`: `PageSpinner` where the wait stands in for the whole page, `BrandSpinner` for part of a page already showing. Both say "Loading" to a screen reader. Importing Mantine's `Loader` directly is a lint warning, because a bare ring has no text; the two buttons that show one while they work are listed as exceptions in `eslint.config.js`.
- **A per-story rule override needs a comment saying why**, and belongs on that story's `parameters.a11y`, never in `.storybook/preview.tsx`, where it would switch the rule off for every story.
- **A story that renders nothing passes without checking anything.** If a component only renders for a user who holds a particular permission, the mock user in `.storybook/preview.tsx` must hold it.
- **Anything clickable is a button or a link.** A click handler on a `div`, or a Mantine `NavLink` with no `href` and no `component`, cannot be reached from the keyboard; `NavLink` defaults to a `button` in `theme.ts` for this reason.
- **Text colours come from the tokens in `theme.ts`**, which are tested to meet 4.5:1. Greys 4 to 6 are for icons and borders, never for text; muted text is `c="dimmed"`.

## Testing and stories

- Use `renderWithMantine` or `renderWithRouter` from `@test/test-utils` in all tests.
- Use `VariantStack` and `VariantRow` from `src/stories/variants.tsx` for "all sizes" or "all variants" stories.
- Use `StoryNote` from `src/stories/variants.tsx` for **all** descriptive text in stories (e.g. "Constrained to 18rem width for display"). Never use raw `<Text>`, `<div>`, or other elements for story descriptions.
- **Labels go below components** - when labelling variants (sizes, states, etc.), place the `<StoryNote>` underneath the component, not above it.
- **Longer prose goes in an `.mdx` guide, not on the story meta.** For anything beyond a caption - when to use a component, how it relates to others, what it deliberately does not do - add a sibling `.mdx` file with `<Meta title="<same title as the stories file>/Guide" />`.
- **Never use `parameters.docs.description` - it renders nowhere.** No story in this project sets `tags: ["autodocs"]` and there is no global equivalent, so Storybook generates no Docs page for a component and a description on the meta has nothing to render into. It type-checks, passes every hook and both test suites, and produces nothing, which makes it the kind of mistake that is only ever found by someone going to look for the text. If a Docs page is ever wanted for a component, the fix is `tags: ["autodocs"]` on that meta - not a description on its own.
- **Verify a docs change actually rendered.** A Storybook build writes an `index.json`; a guide appears there as an entry of type `docs`. Neither the type checker nor the test suites can tell you whether documentation reached the page.
- Loading/skeleton stories should be placed **last** in the stories file, follow by dark mode.
- Use `layout: "padded"` (not `"centered"`) so stories render top-left. Exception: layout components (e.g. `MainLayout`, `NotFoundLayout`).
- **Do NOT wrap stories in `MemoryRouter`** - Storybook's `preview.tsx` already provides a `RouterProvider` context. Adding a `MemoryRouter` decorator causes a "cannot render a Router inside another Router" error.
- **Exception - custom router with initial state**: If a component reads `location.state`, set `parameters: { disableDefaultRouter: true }` and provide your own `createMemoryRouter` with `initialEntries` containing state. You **must** wrap the `<RouterProvider>` in `<MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>` (imported from `@/theme`) since `disableDefaultRouter` bypasses the decorator that normally provides it.

<!-- cspell:words autodocs centered -->
