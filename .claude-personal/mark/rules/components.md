---
paths:
  - "frontend/src/components/**"
---

# Component conventions

Turva's shared components live in `frontend/src/components/`, and each has
stories in Storybook. They came across from Quill Medical's catalogue,
adapted for Turva, in the Storybook port plan
(`plans/2026-11-17-storybook-port-plan.md`).

## Two themes, for now

- **The components and Storybook use `src/theme.ts`.** Its fonts, sizes
  and the shared stylesheets in `src/styles/` are loaded by
  `.storybook/preview.tsx`.
- **Turva's existing pages use `src/legacyTheme.ts`**, from `main.tsx`,
  so they keep their old look until each view moves across to these
  components in a later plan. Mantine writes its CSS variables once at
  the root of the page, so a view cannot switch theme by nesting a
  second `MantineProvider`.
- **Both share the link colours**, `linkColourVariables` in `theme.ts`.
  Delete `legacyTheme.ts` when the last view has moved.

## Reuse before creating

- **Reuse existing components** from this `components/` folder. Always
  check what already exists before creating anything new.
- Use **typography components** from `components/typography/` for **all**
  text: `BodyText`, `BodyTextBold`, `BodyTextInline`, `Heading`,
  `ErrorMessage`, `FieldDescription`, `MarkdownView` and the rest in its
  `index.ts`. Never use raw Mantine `<Text>`, `<Title>`, or plain HTML
  text elements. If none fits, ask a human before creating a new one.
- Use **`<PageHeader>`** (`components/page-header`) for the page title,
  and only for that: every page has exactly one, visible and at one size,
  and it is the page's only `h1` and its browser-tab title. Section
  headings within a page use **`<Heading>`**, always an `h2`.
- Use **`<BaseCard>`** from `components/base-card/BaseCard.tsx` for
  **all** cards - never Mantine's `<Card>` directly. BaseCard fixes
  `shadow="sm"`, `padding="lg"`, `radius="md"` and `withBorder`; they
  cannot be overridden.
- Use the **`<Icon>`** component from `components/icons/Icon.tsx` to wrap
  **all** Tabler icons - never render one directly in JSX. Register any
  new icon in `components/icons/appIcons.ts` first, in both its export
  list and `iconCatalogue`, in alphabetical order.
- **Tables are `DataTable` or `DataTableControlled`** from
  `components/tables/`. `DataTableControlled` adds search, filters,
  sorting and paging; a narrow container gets `DataCard`s instead of
  rows.
- If you need a new component with nothing to compose it from, **stop
  and ask a human** - do not create new atomic components on your own.
- Every new component has a `.stories.tsx` and a `.test.tsx` beside it.

## Safety components

The `components/safety/` folder shows safety files, hazards and
mitigations. Two rules there outrank convenience.

- **A risk level is never worked out in the browser** (TH-008 in
  `SAFETY.md`). It arrives from the server in an `Assessment`, or, while
  somebody chooses scores, from `previewAssessment` in `@/lib/safety`,
  through `useAssessmentPreview`. No component holds a risk matrix, and
  nothing a component submits carries `risk_level` or `risk_label`. A
  test on each form checks this.
- **Types come from `@/lib/safety`**, which re-exports what Turva's API
  serves from `@/api/types`, so each has one definition. Turva sends a
  hazard's status as a string: narrow it with `isHazardStatus`, and a
  score with `isRiskScore`, rather than `as`.
- **A component for a feature Turva's API does not have yet is marked.**
  Its stories' meta takes `decorators: [aheadOfTheApi("<the feature>")]`,
  from `src/stories/aheadOfTheApi.tsx`, which prints "Not yet in Turva's
  API: ..." under every story, and its file comment says the same. Take
  both off when the route is written.
- **A component takes data as props.** The one exception is
  `previewAssessment`, which defaults to the API call; stories and tests
  always pass `samplePreview` instead.

## Language and text

- **British English** for all UI text, comments, and code identifiers
  (e.g. `colour` not `color` in our own props). Exceptions: external
  APIs, libraries, CSS properties, HTTP headers.
- **No em dashes or en dashes** in UI text, comments or stories. Use a
  comma, colon, full stop or brackets, or a spaced hyphen ( - ).
- **Sentence case** for all UI labels, buttons, and headings ("Add new
  user", not "Add New User"). Exceptions: product names, acronyms,
  proper nouns.

## Styling

- **No inline styles** - use Mantine component props or CSS modules only.
- **Use `rem` instead of `px`** in CSS modules for component dimensions.
  Breakpoints come from `src/breakpoints.json` through the theme
  (`sm` is `40em`) - don't hardcode them.
- **Responsive**: use `theme.breakpoints.sm` for mobile and desktop
  splits, through `useMediaQuery`.
- **Button layout**:
  - Use `ButtonPair` / `ButtonPairRed` for action pairs (submit and
    cancel, confirm and dismiss). They right-align on desktop and stack
    full width on mobile.
  - For a standalone button, wrap it in `<Group justify="flex-end">`.
  - Page-header actions (`AddButton`, or any button or badge beside the
    title) go in `PageHeader`'s `action` prop, never in a hand-built
    `<Group justify="space-between">`. Pass `actionAlign="center"` for
    something shorter than the title, such as a badge.
  - A table's own action goes in `DataTableControlled`'s `action` prop,
    in the row with search and filter.
- **A disabled control keeps the ordinary pointer.** Never give one
  `cursor: not-allowed`. A control here is disabled far more often
  because something is under way or already done than because somebody
  may not use it, and the "no entry" sign reads as a refusal.
  `src/styles/disabled-controls.css` sets this for every Mantine control.
  Something in progress is better shown with a button's `loading` state.

## Colours

- **All colours come from the design system** - never hardcoded values
  (`black`, `#333`, `rgb(...)`) in components or CSS modules.
- **Never use Mantine's built-in colour names** (`"red"`, `"blue"`,
  `"teal"` and so on) as `color` values. Use the design system's CSS
  variables: `var(--alert-color)`, `var(--success-color)`,
  `var(--warning-color)`, `var(--info-color)`, `var(--neutral-color)`,
  `var(--accent-color)`, `var(--outstanding-color)`.
- **Never use Mantine's built-in colour scales** (`dark.4`,
  `--mantine-color-blue-6`). Use `primary`, `secondary`, `gray` and the
  semantic colours below.
- **Brand colours**: `brandColours` from `@/theme`. **Scales**:
  `primaryScale`, `secondaryScale`, `greyScale` from `@/theme`.
  **Status and text colours**: `statusColours`, `statusTextColour` and
  `textColours` from `@/styles/semanticColours`. **Badge colours**:
  `badgeColours` and `BADGE_VARIANT` from
  `components/badge/badgeColours.ts`.
- **Turva's purples are pale.** In dark mode, text on `primary` 6 is
  below AA; `DataTable`'s stripe uses shade 9 and its hover shade 8.
  Check the contrast before putting text on a purple fill.
- **Dark mode borders**: form inputs use
  `var(--mantine-color-primary-9)` for their border in dark mode, through
  `[data-mantine-color-scheme="dark"]` selectors in CSS modules. The
  error state uses `var(--error-color)`, through `[data-error]`.

## Accessibility

- **Every story must pass the Storybook accessibility check**, in light
  and in dark mode. CI runs axe against WCAG 2.2 AA on every story and
  fails on any violation.
- **Icon-only buttons are `IconButton`**, from `components/button/`,
  which requires an accessible name.
- **A wait is `BrandSpinner` or `PageSpinner`**, from
  `components/loading-spinner/`: `PageSpinner` where the wait stands in
  for the whole page, `BrandSpinner` for part of a page already showing.
  Both say "Loading", or the `label` given, to a screen reader. Do not
  use Mantine's `Loader` directly: a bare ring has no text.
- **A per-story rule override needs a comment saying why**, and belongs
  on that story's `parameters.a11y`, never in `.storybook/preview.tsx`.
- **A story that renders nothing passes without checking anything.** If
  a component only renders for a user with a particular permission, give
  the story `parameters.mockUser`.
- **Anything clickable is a button or a link.** A click handler on a
  `div` cannot be reached from the keyboard.
- **Text colours come from the tokens in `theme.ts`**, which are tested
  to meet 4.5:1. Greys 4 to 6 are for icons and borders, never for text;
  muted text is `c="dimmed"`.

## Testing and stories

- Use `renderWithMantine` or `renderWithRouter` from `@/test/test-utils`
  in all tests.
- **Sample data is shared, never invented per file.** Tables use
  `hazardRows` from `src/stories/hazardRows.ts`; the safety components use
  `src/test/safetyFile.ts`. Its risk levels come from a copy of Turva's
  matrix that `app/config/tests/test_sample_risk_matrix.py` checks
  against `safety_file/risk.py`.
- `tsconfig` sets `noUncheckedIndexedAccess`, so `list[0]` may be
  `undefined`. Name a sample (`MITIGATED_HAZARD`) or guard it rather than
  using `!`.
- Use `VariantStack` and `VariantRow` from `src/stories/variants.tsx` for
  "all sizes" or "all variants" stories.
- Use `StoryNote` from `src/stories/variants.tsx` for **all** descriptive
  text in stories. Never raw `<Text>` or `<div>`.
- **Labels go below components** - place a `<StoryNote>` underneath the
  component it describes.
- **Longer prose goes in an `.mdx` guide, not on the story meta.** Add a
  sibling `.mdx` file with `<Meta title="<the stories' title>/Guide" />`.
- **Never use `parameters.docs.description` - it renders nowhere.** No
  story sets `tags: ["autodocs"]`, so there is no Docs page for it to
  render into. It type-checks and passes every test, and produces
  nothing.
- **Verify a docs change actually rendered.** A Storybook build writes an
  `index.json`; a guide appears there as an entry of type `docs`.
- Loading and skeleton stories go **last** in the file, followed by dark
  mode.
- Use `layout: "padded"` (not `"centered"`) so stories render top-left.
- **Do NOT wrap stories in `MemoryRouter`** - `.storybook/preview.tsx`
  already provides a router. Set `parameters.routerPath` for the path a
  story renders at.
- **A component that needs its own router** sets
  `parameters: { disableDefaultRouter: true }` and provides its own
  `createMemoryRouter`. Wrap its `<RouterProvider>` in
  `<MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>`
  from `@/theme`, since the default decorator is bypassed.

<!-- cspell:words autodocs centered -->
