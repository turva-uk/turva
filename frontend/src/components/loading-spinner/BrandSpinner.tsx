/**
 * BrandSpinner Component
 *
 * Turva's belt, folding in on itself and out again: the one spinner Turva
 * shows for a wait. Use it as it is for part of a page that is already on
 * screen, and `PageSpinner` where the wait stands in for the whole page.
 * The small ring inside a button is the only other spinner, and stays a
 * plain Mantine `Loader` with `aria-hidden`, because the button already
 * says what is happening.
 *
 * A picture with no text says nothing to a screen reader, so the image is
 * hidden from assistive technology and paired with a visually hidden
 * `role="status"` saying "Loading" (WCAG 4.1.3 Status messages).
 *
 * Somebody who has asked their device for less motion sees the belt's
 * still first frame, fading gently in and out, so the page still shows it
 * is working.
 */

import { Box, VisuallyHidden, type BoxProps } from "@mantine/core";

import classes from "./BrandSpinner.module.css";

/** The animation, and its still first frame, both in `frontend/public/`. */
export const BELT_SPINNER_SRC = `${import.meta.env.BASE_URL}belt-spinner.webp`;
export const BELT_SPINNER_STILL_SRC = `${import.meta.env.BASE_URL}belt-spinner-still.png`;

export interface BrandSpinnerProps {
  /** What is loading, read out by screen readers. Defaults to "Loading". */
  label?: string;
  /** Width and height, as Mantine's `w` and `h` take them. Defaults to 4rem. */
  size?: BoxProps["w"];
}

export default function BrandSpinner({ label = "Loading", size = "4rem" }: BrandSpinnerProps) {
  return (
    <Box className={classes.spinner} w={size} h={size}>
      <div className={classes.still} aria-hidden="true">
        <picture className={classes.picture}>
          <source media="(prefers-reduced-motion: reduce)" srcSet={BELT_SPINNER_STILL_SRC} />
          <img className={classes.image} src={BELT_SPINNER_SRC} alt="" />
        </picture>
      </div>
      <VisuallyHidden role="status">{label}</VisuallyHidden>
    </Box>
  );
}
