/**
 * Semantic Colour Palette
 *
 * Brand colours are defined in theme.ts (which generates CSS variables).
 * This file re-exports them for TypeScript consumers and adds status/text tokens.
 *
 * Organised into:
 * - Brand: primary, secondary, background and mark colours (from theme.ts)
 * - Status: state-communicating colours (badges, alerts, validation)
 * - Text: typography colour tokens
 *
 * Status colours use CSS variables (e.g. "var(--success-color)") defined
 * in theme.ts via cssVariablesResolver. `bg` is identical in light and
 * dark modes, a filled background with white or dark text; `fg` is the
 * status as a word on the page, and changes with the scheme.
 */

import { brandColours } from "@/theme";

/* ------------------------------------------------------------------ */
/*  Brand colours                                                      */
/* ------------------------------------------------------------------ */

export const brand = brandColours;

/* ------------------------------------------------------------------ */
/*  Status colours                                                     */
/* ------------------------------------------------------------------ */

type StatusColourConfig = {
  /** Background colour (Mantine colour token or hex) */
  bg: string;
  /**
   * Colour for the status as a word on the page, with no fill: follows
   * the colour scheme, where `bg` does not. Never use `bg` for text.
   */
  fg: string;
  /** Text colour for contrast on the background */
  text: string;
  /** When to use this colour */
  usage: string;
};

export type StatusColourName =
  "success" | "warning" | "outstanding" | "info" | "neutral" | "accent" | "alert" | "update";

export const statusColours: Record<StatusColourName, StatusColourConfig> = {
  success: {
    bg: "var(--success-color)",
    fg: "var(--success-text-color)",
    text: "white",
    usage: "Active, completed, final, pass",
  },
  warning: {
    bg: "var(--warning-color)",
    fg: "var(--warning-text-color)",
    text: "white",
    usage: "Draft, pending",
  },
  outstanding: {
    bg: "var(--outstanding-color)",
    fg: "var(--outstanding-text-color)",
    text: "white",
    usage: "Deactivated, cancelled, fail",
  },
  info: {
    bg: "var(--info-color)",
    fg: "var(--info-text-color)",
    text: "white",
    usage: "Upcoming, amended, admin, unread",
  },
  neutral: {
    bg: "var(--neutral-color)",
    // A yellow word is unreadable on white; neutral text is body text.
    fg: "var(--mantine-color-text)",
    text: "dark",
    usage: "Staff, default",
  },
  accent: {
    bg: "var(--accent-color)",
    fg: "var(--accent-text-color)",
    text: "white",
    usage: "Incomplete, special states",
  },
  alert: {
    bg: "var(--alert-color)",
    fg: "var(--alert-text-color)",
    text: "white",
    usage: "Attention needed",
  },
  update: {
    bg: "var(--update-color)",
    fg: "var(--mantine-color-text)",
    text: "dark",
    usage: "Nothing recorded yet, and gentle prompts to act",
  },
};

/**
 * The CSS colour to paint text in, on a given status colour's fill.
 *
 * `text` above says "white" or "dark", and "dark" needs resolving to an
 * actual colour. Doing that at each call site is how a swatch and the
 * card beside it came to disagree: one passed "dark" to Mantine and got
 * its near-black, the other resolved it to the body text colour.
 * One function, so they cannot drift again.
 *
 * It resolves to near-black: on the yellow `neutral` fill that is the
 * strongest contrast, and a status fill exists to be read at a glance.
 */
export function statusTextColour(name: StatusColourName): string {
  return statusColours[name].text === "dark" ? "var(--status-text-dark)" : "white";
}

/* ------------------------------------------------------------------ */
/*  Text colours                                                       */
/* ------------------------------------------------------------------ */

type TextColourConfig = {
  /** Mantine `c` prop value, CSS variable, or description */
  value: string;
  /** When to use this colour */
  usage: string;
};

/**
 * Every text colour here meets WCAG AA, 4.5:1, on the surfaces it is
 * used on, in both colour schemes; `theme.test.ts` holds them to it.
 * `muted`, `link` and `error` change with the scheme, which the
 * Foundations/Colours story shows by switching the toolbar.
 *
 * Input placeholders are deliberately not listed here: a placeholder is
 * never a colour for content, and a text sample of one would fail the
 * story's own a11y check. They have their own list, `placeholderColours`
 * below, which the story shows inside real fields rather than as text.
 */
export const textColours: Record<string, TextColourConfig> = {
  default: {
    value: "inherit",
    usage: "Heading, PageHeader - the page's own text colour",
  },
  body: {
    value: "var(--mantine-color-text)",
    usage: "BodyText - primary body text",
  },
  muted: {
    value: "var(--mantine-color-dimmed)",
    usage: "FieldDescription, EmptyState - secondary text",
  },
  link: {
    value: "var(--link-color)",
    usage: "TextLink - links",
  },
  error: {
    value: "var(--error-color)",
    usage: "ErrorMessage - validation and error messages",
  },
};

/* ------------------------------------------------------------------ */
/*  Placeholder colours                                                */
/* ------------------------------------------------------------------ */

/**
 * The colours of an input's placeholder: the hint shown in an empty
 * field. Fainter than any text colour on purpose, so a hint is never
 * mistaken for something typed. Neither meets 4.5:1, and neither is ever
 * to be used for content.
 *
 * `error` is the placeholder of a field in the error state. Mantine
 * paints it the full error colour, the same red as the field's border,
 * which made an empty field look as if something wrong had been typed
 * into it. It is `--error-color` at 55%, part transparent, so it follows
 * the error colour in both schemes and thins towards the field behind it.
 * Each form field's CSS module sets it on `[data-error]`.
 */
export const placeholderColours: Record<string, TextColourConfig> = {
  default: {
    value: "var(--mantine-color-placeholder)",
    usage: "The hint in an empty field",
  },
  error: {
    value: "var(--error-placeholder-color)",
    usage: "The hint in an empty field that is in error: softer than the field's red border",
  },
};
