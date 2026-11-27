/**
 * Shared layout constants
 *
 * Single source of truth for spacing and sizing that all layout
 * components inherit. When adding a new layout, import these
 * values rather than defining your own.
 */

import type { MantineSpacing } from "@mantine/core";

/** Vertical padding applied above page content inside every layout. */
export const LAYOUT_PADDING_TOP: MantineSpacing = "md";

/** Vertical padding applied below page content inside every layout. */
export const LAYOUT_PADDING_BOTTOM: MantineSpacing = "xl";

/**
 * Where something sticky at the top of the page sits: up through the
 * padding above the content, to the very edge of the scrolling area. A
 * sticky element stops at the padding's edge, so at `0` the text it
 * scrolls over showed in the gap above it.
 */
export const LAYOUT_STICKY_TOP = `calc(-1 * var(--mantine-spacing-${LAYOUT_PADDING_TOP}))`;

/** Where something sticky at the foot of the page sits, the same way. */
export const LAYOUT_STICKY_BOTTOM = `calc(-1 * var(--mantine-spacing-${LAYOUT_PADDING_BOTTOM}))`;

/** Horizontal padding applied to the content area (0 on mobile). */
export const LAYOUT_PADDING_X: MantineSpacing = "md";

/** Width in pixels for sidebars and navigation drawers. */
export const LAYOUT_SIDEBAR_WIDTH = 260;

/**
 * The ribbon's height in pixels, yellow rule included. The app shell's
 * header takes it, and the ribbon's stories draw it at the same height.
 */
export const LAYOUT_RIBBON_HEIGHT = 70;

/** Z-index for the sticky header ribbon. */
export const LAYOUT_RIBBON_Z_INDEX = 100;
