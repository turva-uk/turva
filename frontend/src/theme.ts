import { createTheme } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";

/**
 * Turva's brand palette, taken from the identity used on turva.org.
 *
 * Both scales are derived from the logo mark itself: a purple curve on a
 * yellow ground. The two hexes in that SVG are the only colours that are
 * genuinely "the brand", and everything here is a tint or shade of them.
 *
 *   purple  #716c9e   the stroke        -> TURVA_PURPLE[6]
 *   yellow  #dec55e   the ground        -> TURVA_YELLOW[6]
 *
 * **Shade 6 is not a free choice.** It is Mantine's default `primaryShade`
 * for the light scheme, so index 6 is what a filled button actually renders.
 * Putting the real brand colour there is what makes the interface look like
 * the brand rather than approximately like it.
 *
 * Contrast is checked rather than assumed, and the check is enforced by
 * `app/config/tests/test_palette.py` so that editing a hex here fails a test
 * rather than quietly degrading the interface. The notes below record what
 * the numbers actually are.
 */

/**
 * The purple scale. Shade 6 is the logo stroke.
 *
 * White on shade 6 is 4.84:1 - AA for normal text, but with only a 0.34
 * margin, so shade 6 is for *fills* and not for text on a light background.
 * Brand-coloured text uses shade 8 (`BRAND_TEXT` below), because shade 6 as
 * link text on the sunk panel background measures 4.29:1 and fails.
 */
export const TURVA_PURPLE = [
  "#f3f2ff",
  "#e3e2f0",
  "#c5c3d9",
  "#a5a2c2",
  "#8a86ae",
  "#7974a2",
  "#716c9e",
  "#5f5a8a",
  "#54507c",
  "#474470",
] as const;

/**
 * The yellow scale, generated from the logo's ground at shade 6.
 *
 * **This is a dark-text colour.** Shades 0-8 all fail against white and all
 * pass comfortably against near-black; only shade 9 flips. turva.org gets
 * this right on its own call-to-action button, which sets black text on the
 * yellow explicitly - worth copying rather than rediscovering.
 */
export const TURVA_YELLOW = [
  "#faf9f5",
  "#f2eedf",
  "#ebe4c8",
  "#e5dbb0",
  "#e1d396",
  "#dfcb7b",
  "#dec55e",
  "#d4b32b",
  "#a18821",
  "#6e5d17",
] as const;

/** The logo purple. Fills that carry white text. */
export const BRAND = TURVA_PURPLE[6];

/**
 * Brand-coloured *text* on a light background: links, secondary buttons.
 *
 * Two steps darker than the logo purple, which buys 7.33:1 on the page
 * background - AAA for body text - and 6.61:1 on the sunk panel. The NHS
 * design system's "aim for AAA as far as possible" is a good rule to borrow
 * for a tool whose readers are often reading it because something went wrong.
 */
export const BRAND_TEXT = TURVA_PURPLE[8];

/** The logo yellow, and the only text colour that may sit on it. */
export const ACCENT = TURVA_YELLOW[6];
export const ACCENT_INK = "#1a1a2e";

// Form descriptions carry important qualifications (including the CSO
// criteria). Mantine's default light-scheme dimmed grey is below 4.5:1.
export const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: { "--mantine-color-dimmed": theme.colors.gray[7] },
  dark: {},
});

export const theme = createTheme({
  colors: {
    turva: [...TURVA_PURPLE],
    turvaYellow: [...TURVA_YELLOW],
  },
  primaryColor: "turva",
  // Stated rather than left to the default. It is load-bearing - it decides
  // which shade a filled button uses - and a future Mantine major changing
  // the default should not silently restyle the interface.
  primaryShade: { light: 6, dark: 7 },
  components: {
    // Semantic alert fills still distinguish warnings/errors, but their small
    // headings need normal text contrast (the default yellow heading fails AA).
    Alert: { styles: { title: { color: "var(--mantine-color-text)" } } },
    Anchor: { defaultProps: { c: BRAND_TEXT } },
    Button: { defaultProps: { radius: 0 } },
    TextInput: { defaultProps: { radius: 0 } },
    Select: { defaultProps: { radius: 0 } },
    MultiSelect: { defaultProps: { radius: 0 } },
    Textarea: { defaultProps: { radius: 0 } },
    Card: { defaultProps: { radius: 0 } },
    PasswordInput: { defaultProps: { radius: 0 } },
  },
});
