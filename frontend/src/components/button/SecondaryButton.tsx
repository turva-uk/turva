/**
 * SecondaryButton Component
 *
 * A button for the less important of two actions, or one that changes
 * nothing, such as "Cancel" or "Check again": an outline in the primary
 * colour, at the same size as the filled buttons beside it.
 *
 * While `disabled`, it says so to a screen reader and ignores presses, but
 * keeps the ordinary pointer, as every disabled control here does. While
 * `loading`, it shows a spinner in place of its words and ignores presses,
 * for something that takes a few seconds, such as preparing a PDF.
 *
 * @example
 * ```tsx
 * <SecondaryButton onClick={refresh}>Check again</SecondaryButton>
 * ```
 */

import { Button } from "@mantine/core";
import type { ReactNode } from "react";

import classes from "./SecondaryButton.module.css";

export interface SecondaryButtonProps {
  /** The button's words */
  children: ReactNode;
  /** Called when the button is pressed */
  onClick: () => void;
  /** The button cannot be pressed just now */
  disabled?: boolean;
  /** What the button started is under way */
  loading?: boolean;
  /** For tests to find it */
  "data-testid"?: string;
}

export default function SecondaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  "data-testid": testId,
}: SecondaryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      loading={loading}
      onClick={disabled ? (event) => event.preventDefault() : onClick}
      aria-disabled={disabled || undefined}
      className={disabled ? classes.disabled : undefined}
      data-testid={testId}
    >
      {children}
    </Button>
  );
}
