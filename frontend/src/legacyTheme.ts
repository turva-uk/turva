import { createTheme } from "@mantine/core";
import type { CSSVariablesResolver } from "@mantine/core";

import { errorColourVariables, linkColourVariables, TURVA_PURPLE, TURVA_YELLOW } from "./theme";

/**
 * The theme Turva's existing pages use, so they keep the look they had before
 * the shared components arrived: Mantine's system fonts and sizes, its
 * heading sizes and breakpoints, and no global stylesheets.
 *
 * `theme.ts` is the theme of the shared components, and of Storybook. Each
 * view moves across to the shared components, one at a time, in a later plan.
 * **Delete this file when the last view has moved**, and give `main.tsx` the
 * theme from `theme.ts`.
 *
 * It is a copy of the theme as it was, not a cut-down version of the new one,
 * so a change to the components theme cannot reach the existing pages. The
 * accessibility fixes stay: links follow `--link-color`, which
 * is `BRAND_TEXT` in light mode, as before, and a pale purple in dark mode,
 * where `BRAND_TEXT` was 2.1:1 on the dark body. The colour scales come from
 * `theme.ts`, unchanged, because `app/config/tests/test_palette.py` pins them
 * there. Muted guidance and validation errors also keep normal-text contrast
 * in both schemes.
 */

// Form descriptions carry important qualifications (including the CSO
// criteria). Mantine's default dimmed greys are below 4.5:1 in both schemes.
export const legacyCssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": theme.colors.gray[7],
    ...errorColourVariables.light,
    ...linkColourVariables.light,
  },
  dark: {
    "--mantine-color-dimmed": theme.colors.dark[1],
    ...errorColourVariables.dark,
    ...linkColourVariables.dark,
  },
});

export const legacyTheme = createTheme({
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
    // No fixed colour on Anchor: `--mantine-color-anchor` is `--link-color`.
    // It used to be `c: BRAND_TEXT`, which is unreadable in dark mode.
    Button: { defaultProps: { radius: 0 } },
    TextInput: { defaultProps: { radius: 0 } },
    Select: { defaultProps: { radius: 0 } },
    MultiSelect: { defaultProps: { radius: 0 } },
    Textarea: { defaultProps: { radius: 0 } },
    Card: { defaultProps: { radius: 0 } },
    PasswordInput: { defaultProps: { radius: 0 } },
  },
});
