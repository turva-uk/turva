/**
 * The WCAG baseline every automated accessibility check runs against.
 *
 * One definition, read by the Storybook a11y checks
 * (`.storybook/preview.tsx`) and the end-to-end page scans
 * (`e2e/fixtures/axe.ts`), so a component and the page it sits on are
 * held to the same rules.
 */

/** axe-core tags for WCAG 2.0, 2.1 and 2.2 at levels A and AA. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

/**
 * Rules to switch on beyond the tags. axe ships `target-size` (WCAG
 * 2.5.8, Target size minimum) disabled, although it is AA.
 */
export const EXTRA_RULES: ReadonlyArray<{ id: string; enabled: boolean }> = [
  { id: "target-size", enabled: true },
];
