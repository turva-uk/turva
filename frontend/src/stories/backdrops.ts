/**
 * Storybook backdrop styles, for stories whose component sits on a
 * coloured surface rather than the page.
 */

import type { CSSProperties } from "react";

/**
 * Style for a story backdrop in the darkest brand purple, shade 9, the
 * ground a public page's dark sections sit on.
 *
 * Shade 9 rather than the logo purple, shade 6: the public components put
 * yellow and pale grey text on it, which is 5.6:1 and 6.0:1 on shade 9 and
 * under 3.3:1 on shade 6.
 *
 * Variant labels are `dimmed` text, which the theme darkens in light
 * mode; on the purple that is unreadable, so the backdrop swaps in white
 * whatever the scheme: 9.0:1 on shade 9.
 */
export const BRAND_BACKDROP: CSSProperties = {
  background: "var(--mantine-color-primary-9)",
  ["--mantine-color-dimmed" as string]: "var(--mantine-color-white)",
};
