/**
 * Storybook backdrop styles, for stories whose component sits on a
 * coloured surface rather than the page.
 */

import type { CSSProperties } from "react";

/**
 * Style for a story backdrop in the brand purple.
 *
 * Variant labels are `dimmed` text, which the theme darkens in light
 * mode; on the purple that is unreadable, so the backdrop swaps in white
 * whatever the scheme: 4.84:1 on the logo purple.
 */
export const BRAND_BACKDROP: CSSProperties = {
  background: "var(--brand-primary)",
  ["--mantine-color-dimmed" as string]: "var(--mantine-color-white)",
};
