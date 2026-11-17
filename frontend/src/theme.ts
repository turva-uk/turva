import { createTheme } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";

import breakpoints from "./breakpoints.json";

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

/**
 * The brand colours by role, for the shared components and the colour
 * stories. Each is one of the constants above, so nothing here is a new
 * colour.
 */
export const brandColours = {
  primary: BRAND,
  secondary: ACCENT,
  background: "#ffffff",
  mark: BRAND,
} as const;

export type BrandColours = typeof brandColours;

/**
 * Status colours, used as filled backgrounds: badges, alerts and buttons.
 *
 * Registered as CSS variables (`var(--success-color)` and so on) by
 * `cssVariablesResolver`, and the same in both colour schemes. Every fill
 * that takes white text is dark enough for WCAG AA, 4.5:1; `neutral` and
 * `update` take dark text instead. Ported unchanged from the shared
 * component library, where `theme.test.tsx` holds them to it.
 */
export const statusColourValues = {
  success: "#087f5b", // teal.9, 5.0:1 with white
  warning: "#0b7285", // cyan.9, 5.6:1 with white
  outstanding: "#d6336c", // pink.7, 4.6:1 with white
  info: "#1971c2", // blue.8, 5.0:1 with white
  neutral: "#ffd43b", // yellow.4, dark text
  accent: "#7950f2", // violet.6, 5.0:1 with white
  alert: "#c92a2a", // red.9, 5.5:1 with white
  update: "#e7f5ff", // blue.0, a pale wash with dark text
} as const;

/**
 * Status colours used as words on the page, with no fill behind them.
 *
 * A fill takes white text, so it must be dark; a word sits on the page, so
 * in dark mode it must be light. Light values pass 4.5:1 on white and on
 * `gray.2`; dark values are Mantine's shade 3, which pass on the dark body.
 */
export const statusTextColourValues = {
  light: {
    success: "#07704f",
    warning: "#0b6b7a",
    outstanding: "#a61e4d",
    info: "#1864ab",
    accent: "#6741d9",
    alert: "#b02525",
  },
  dark: {
    success: "#63e6be",
    warning: "#66d9e8",
    outstanding: "#faa2c1",
    info: "#74c0fc",
    accent: "#b197fc",
    alert: "#ff8787",
  },
} as const;

/** `--success-text-color` and the rest, for one colour scheme. */
function statusTextVariables(
  values: Record<keyof typeof statusTextColourValues.light, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [`--${name}-text-color`, value]),
  );
}

/**
 * Typography tokens: the one place font sizes are set.
 *
 * Fixed at every screen width. Body text is 19px, the GOV.UK and NHS
 * minimum, because people often read Turva while something has gone wrong.
 */
export const typographyTokens = {
  fontWeights: {
    body: 500,
    bold: 700,
  },
  fontSizes: {
    xs: "1rem", // 16px
    sm: "1rem", // 16px
    md: "1.1875rem", // 19px, body text
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
  },
  headings: {
    h1: { fontSize: "2rem", lineHeight: "1.3" }, // 32px
    h2: { fontSize: "1.75rem", lineHeight: "1.35" }, // 28px
    h3: { fontSize: "1.5rem", lineHeight: "1.4" }, // 24px
    h4: { fontSize: "1.1875rem", lineHeight: "1.5" }, // 19px
    h5: { fontSize: "1rem", lineHeight: "1.55" }, // 16px
    h6: { fontSize: "1rem", lineHeight: "1.55" }, // 16px
  },
} as const;

/** The body font: Atkinson Hyperlegible Next, from the Braille Institute. */
export const BODY_FONT = "'Atkinson Hyperlegible Next Variable', sans-serif";

/**
 * The display font, Cormorant Garamond, for the few large public titles that
 * ask for it by name. Headings use the body font, as in the shared library.
 */
export const DISPLAY_FONT = "'Cormorant Garamond Variable', serif";

/**
 * Turva's CSS variables, layered on Mantine's.
 *
 * The shared components read these by name. Each value is a Turva brand
 * colour or a status colour above; none changes Turva's palette.
 *
 * Form descriptions carry important qualifications (including the CSO
 * criteria), and Mantine's default light-scheme dimmed grey is below 4.5:1,
 * so `dimmed` is gray.7 in light mode.
 */
export const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--brand-primary": brandColours.primary,
    "--brand-secondary": brandColours.secondary,
    "--brand-background": brandColours.background,
    "--brand-mark": brandColours.mark,
    // Text on the yellow accent fill: the only ink permitted on it.
    "--button-text-dark": ACCENT_INK,
    "--button-active-bg": TURVA_YELLOW[7],
    "--button-outline-hover-text": TURVA_YELLOW[8],
    "--typo-xs": typographyTokens.fontSizes.xs,
    "--typo-sm": typographyTokens.fontSizes.sm,
    "--typo-md": typographyTokens.fontSizes.md,
    "--typo-lg": typographyTokens.fontSizes.lg,
    "--typo-xl": typographyTokens.fontSizes.xl,
    // An empty field's hint while the field is in error: part transparent,
    // so it does not read as something typed wrong.
    "--error-placeholder-color": "color-mix(in srgb, var(--error-color) 55%, transparent)",
    "--success-color": statusColourValues.success,
    "--warning-color": statusColourValues.warning,
    "--alert-color": statusColourValues.alert,
    "--info-color": statusColourValues.info,
    "--neutral-color": statusColourValues.neutral,
    "--accent-color": statusColourValues.accent,
    "--outstanding-color": statusColourValues.outstanding,
    "--update-color": statusColourValues.update,
    "--status-text-dark": "#1a1a1a",
  },
  light: {
    "--mantine-color-dimmed": theme.colors.gray[7],
    "--mantine-color-placeholder": "var(--mantine-color-gray-6)",
    // An orange-red that colour-blind readers can tell from the brand:
    // 5.5:1 on white, 4.7:1 on gray.2.
    "--mantine-color-error": "var(--error-color)",
    "--error-color": "#c4320a",
    "--error-focus-color": "#ffb3b3",
    "--link-color": BRAND_TEXT,
    "--link-hover-color": TURVA_PURPLE[9],
    "--mantine-color-anchor": "var(--link-color)",
    "--card-bg": "var(--mantine-color-white)",
    "--card-border": "var(--mantine-color-gray-3)",
    "--card-border-color": "var(--mantine-color-gray-3)",
    ...statusTextVariables(statusTextColourValues.light),
  },
  dark: {
    // A light coral in dark mode, where the light-mode red is too dark.
    "--mantine-color-error": "var(--error-color)",
    "--error-color": "#ff8a65",
    "--error-focus-color": "#ffb3b3",
    // Purple shade 1 and 0 are light enough to read on Mantine's dark body.
    "--link-color": TURVA_PURPLE[1],
    "--link-hover-color": TURVA_PURPLE[0],
    "--mantine-color-anchor": "var(--link-color)",
    "--card-bg": "var(--mantine-color-dark-6)",
    "--card-border": "var(--mantine-color-dark-4)",
    "--card-border-color": "transparent",
    ...statusTextVariables(statusTextColourValues.dark),
  },
});

export const theme = createTheme({
  fontFamily: BODY_FONT,
  fontFamilyMonospace:
    "'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  colors: {
    turva: [...TURVA_PURPLE],
    turvaYellow: [...TURVA_YELLOW],
    // The same two scales under the role names the shared components use,
    // `var(--mantine-color-primary-6)` and `var(--mantine-color-secondary-6)`.
    // Aliases, not new colours: shade 6 is still the logo colour.
    primary: [...TURVA_PURPLE],
    secondary: [...TURVA_YELLOW],
  },
  primaryColor: "turva",
  // Stated rather than left to the default. It is load-bearing - it decides
  // which shade a filled button uses - and a future Mantine major changing
  // the default should not silently restyle the interface.
  primaryShade: { light: 6, dark: 7 },
  // A focus ring on keyboard focus only, and no animation for anyone whose
  // system asks for reduced motion. Mantine defaults the second to false.
  focusRing: "auto",
  respectReducedMotion: true,
  headings: {
    sizes: typographyTokens.headings,
  },
  // From breakpoints.json, which postcss.config.cjs reads too, so
  // `theme.breakpoints.sm` and `$mantine-breakpoint-sm` cannot disagree.
  breakpoints,
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
    // Mantine's close button is an icon with no accessible name. "Close
    // dialog" rather than "Close", so it differs from a text button that
    // says "Close" in the same modal.
    Modal: { defaultProps: { closeButtonProps: { "aria-label": "Close dialog" } } },
  },
});
