/**
 * SecondaryButton Component
 *
 * A button for the less important of two actions, or one that changes
 * nothing, such as "Cancel" or "Check again": an outline in the primary
 * colour, at the same size as the filled buttons beside it.
 *
 * While `disabled`, it says so to a screen reader and ignores presses, but
 * keeps the ordinary pointer, as every disabled control here does.
 *
 * Give `aria-label` when several buttons in one list show the same words,
 * such as "Revoke" on each row of a table, so a screen reader can tell
 * them apart. It must begin with the words shown, so someone using voice
 * control can still say them.
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
  /**
   * A fuller name for a screen reader, beginning with the words shown, such
   * as "Revoke invitation to a.patel@example.org" for a button showing
   * "Revoke"
   */
  "aria-label"?: string;
  /** For tests to find it */
  "data-testid"?: string;
}

export default function SecondaryButton({
  children,
  onClick,
  disabled = false,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: SecondaryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      onClick={disabled ? (event) => event.preventDefault() : onClick}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={disabled ? classes.disabled : undefined}
      data-testid={testId}
    >
      {children}
    </Button>
  );
}
