/**
 * Badge colour palette
 *
 * This file exists as our badge colours must have a bg colour and associated
 * text colour.
 *
 * Centralised semantic colour tokens for all badge components.
 * Every badge must pick from this constrained set to ensure
 * consistent visual language across the application.
 */

/** Semantic badge colour names */
export type BadgeColour =
  "success" | "warning" | "outstanding" | "info" | "neutral" | "accent" | "alert";

export type BadgeColourConfig = {
  /** Mantine background colour */
  bg: string;
  /** Text colour (white for dark backgrounds, dark for light backgrounds) */
  text: string;
};

/**
 * Maps semantic colour names to background and text colours. The fills
 * are the status tokens from `theme.ts`, dark enough that white text on
 * them meets WCAG AA; neutral is the one pale fill and takes dark text.
 *
 * - success: teal - active, completed, final, pass
 * - warning: cyan - draft, pending
 * - outstanding: pink - deactivated, cancelled, fail
 * - info: blue - upcoming, amended, admin, unread
 * - neutral: yellow - staff, default
 * - accent: violet - incomplete, special states
 * - alert: red - attention needed
 */
export const badgeColours: Record<BadgeColour, BadgeColourConfig> = {
  success: { bg: "var(--success-color)", text: "white" },
  warning: { bg: "var(--warning-color)", text: "white" },
  outstanding: { bg: "var(--outstanding-color)", text: "white" },
  info: { bg: "primary", text: "white" },
  neutral: { bg: "var(--neutral-color)", text: "dark" },
  accent: { bg: "var(--accent-color)", text: "white" },
  alert: { bg: "var(--alert-color)", text: "white" },
};

/** Standard variant for all badges */
export const BADGE_VARIANT = "filled" as const;
