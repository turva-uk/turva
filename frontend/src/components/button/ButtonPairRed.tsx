/**
 * ButtonPairRed Component
 *
 * A paired action/cancel button group where the action button is red.
 * Used for destructive or warning confirmation dialogues (e.g. unsaved changes).
 *
 * @example
 * ```tsx
 * <ButtonPairRed
 *   onAccept={handleLeave}
 *   onCancel={handleStay}
 *   acceptLabel="Leave page"
 *   cancelLabel="Stay on page"
 * />
 * ```
 */

import { Button, Group, Loader } from "@mantine/core";
import classes from "./ButtonPair.module.css";

interface ButtonPairRedProps {
  /** Label for the destructive action button (defaults to "OK") */
  acceptLabel?: string;
  /** Label shown during loading state (defaults to acceptLabel) */
  submittingLabel?: string;
  /** Label for the cancel button (defaults to "Cancel") */
  cancelLabel?: string;
  /** Called when the accept button is clicked */
  onAccept: () => void;
  /** Called when the cancel button is clicked */
  onCancel: () => void;
  /** Disables the accept button (aria-disabled, stays focusable) */
  acceptDisabled?: boolean;
  /** Shows loading spinner on the accept button (hides label) */
  acceptLoading?: boolean;
  /** HTML button type for the accept button (defaults to "button") */
  acceptType?: "button" | "submit";
  /** Horizontal alignment of the button group (defaults to "flex-end") */
  justify?: "flex-end" | "center";
}

export default function ButtonPairRed({
  acceptLabel = "OK",
  submittingLabel,
  cancelLabel = "Cancel",
  onAccept,
  onCancel,
  acceptDisabled = false,
  acceptLoading = false,
  acceptType = "button",
  justify = "flex-end",
}: ButtonPairRedProps) {
  return (
    <Group justify={justify} mt="xs" className={classes.group}>
      <Button
        type={acceptType}
        // The status alert red, not Mantine's "red": with this theme's
        // primaryShade of 5 that is red.5, and white on it is 2.8:1.
        color="var(--alert-color)"
        onClick={acceptDisabled ? (e: React.MouseEvent) => e.preventDefault() : onAccept}
        aria-disabled={acceptDisabled || undefined}
        size="md"
        styles={{
          root: acceptDisabled ? { opacity: 0.6, cursor: "default" } : undefined,
        }}
      >
        {acceptLoading ? (
          <Group gap="xs" wrap="nowrap">
            <Loader size="xs" color="white" aria-hidden="true" />
            {submittingLabel ?? acceptLabel}
          </Group>
        ) : (
          acceptLabel
        )}
      </Button>
      <Button variant="outline" onClick={onCancel} size="md">
        {cancelLabel}
      </Button>
    </Group>
  );
}
