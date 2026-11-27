/**
 * TurvaLogo Component
 *
 * Turva's logo mark: the purple curve and bar on a yellow square, drawn
 * from the paths in `public/favicon.svg` but coloured from the theme, so
 * it follows `primaryScale` and `secondaryScale` rather than fixing hexes.
 *
 * Its corners are rounded with the theme's `md` radius, as the cards are.
 *
 * It is an image called "Turva" by default. Pass `decorative` when text
 * beside it already says "Turva", so a screen reader does not say it twice.
 *
 * @example
 * ```tsx
 * <TurvaLogo size={96} />
 * <Group><TurvaLogo decorative /><Heading>Turva</Heading></Group>
 * ```
 */

import classes from "./TurvaLogo.module.css";

export interface TurvaLogoProps {
  /** Width and height in pixels. Defaults to 96. */
  size?: number;
  /** The accessible name. Defaults to "Turva". */
  label?: string;
  /** Hide it from assistive technology, when nearby text already says "Turva" */
  decorative?: boolean;
}

const MARK = "var(--mantine-color-primary-6)";
const GROUND = "var(--mantine-color-secondary-6)";

export default function TurvaLogo({
  size = 96,
  label = "Turva",
  decorative = false,
}: TurvaLogoProps) {
  const naming = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 375 375"
      width={size}
      height={size}
      focusable="false"
      className={classes.logo}
      data-testid="turva-logo"
      {...naming}
    >
      <rect width="375" height="375" fill={GROUND} />
      <path
        fill="none"
        stroke={MARK}
        strokeWidth={49}
        d="M 16.837124 22.337846 C 102.24372 103.143632 234.59845 103.144851 413.897734 22.337707"
        transform="matrix(0.544529,0.515861,-0.513704,0.542251,102.720804,48.79931)"
      />
      <path
        fill="none"
        stroke={MARK}
        strokeWidth={49}
        d="M 0.000205221 24.498591 L 351.65127 24.498591"
        transform="matrix(0.75,0,0,0.75,58.87094,257.665121)"
      />
    </svg>
  );
}
