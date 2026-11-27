/**
 * ButtonPair Component
 *
 * A paired accept/cancel button group for modals and forms.
 * Provides consistent styling and layout for confirm/dismiss actions.
 *
 * When `acceptChildren` is provided, it replaces the accept button label,
 * allowing custom content (e.g. a spinner + text grid swap) while keeping
 * the same sizing and layout.
 *
 * Uses aria-disabled instead of native disabled so the button stays
 * focusable for screen readers and renders with a faded appearance
 * rather than Mantine's default grey.
 *
 * @example
 * ```tsx
 * <ButtonPair
 *   onAccept={handleSave}
 *   onCancel={handleClose}
 * />
 * ```
 */

import type { ReactNode } from "react";
import { Button, Group, type MantineSpacing } from "@mantine/core";
import { LAYOUT_STICKY_BOTTOM } from "@/components/layouts/layoutConstants";
import classes from "./ButtonPair.module.css";
import SecondaryButton from "./SecondaryButton";

interface ButtonPairProps {
  /** Label for the accept/confirm button (defaults to "OK") */
  acceptLabel?: string;
  /** Label for the cancel button (defaults to "Cancel") */
  cancelLabel?: string;
  /** Called when the accept button is clicked */
  onAccept?: () => void;
  /** Called when the cancel button is clicked - cancel button hidden when omitted */
  onCancel?: () => void;
  /** Disables the accept button (aria-disabled, stays focusable) */
  acceptDisabled?: boolean;
  /** Blocks cancellation after a caller has started an irreversible action. */
  cancelDisabled?: boolean;
  /** Shows loading spinner on the accept button (hides label) */
  acceptLoading?: boolean;
  /** HTML button type for the accept button (defaults to "button") */
  acceptType?: "button" | "submit";
  /** Custom content for the accept button, overrides acceptLabel */
  acceptChildren?: ReactNode;
  /** data-testid for the accept button */
  acceptTestId?: string;
  /** Horizontal alignment of the button group (defaults to "flex-end") */
  justify?: "flex-end" | "center";
  /** Keep buttons full-width at all screen sizes */
  fullWidth?: boolean;
  /**
   * Keep the pair at the foot of the scrolling area while the page above
   * it is longer than the screen, as on a long document being edited
   */
  sticky?: boolean;
  /**
   * Space above the pair (defaults to "xs"). A form's submit button asks for
   * more, so it sits clearly apart from the last field.
   */
  mt?: MantineSpacing;
}

export default function ButtonPair({
  acceptLabel = "OK",
  cancelLabel = "Cancel",
  onAccept,
  onCancel,
  acceptDisabled = false,
  cancelDisabled = false,
  acceptLoading = false,
  acceptType = "button",
  acceptChildren,
  acceptTestId,
  justify = "flex-end",
  fullWidth = false,
  sticky = false,
  mt = "xs",
}: ButtonPairProps) {
  const className = [
    classes.group,
    fullWidth ? classes.fullWidth : "",
    sticky ? classes.sticky : "",
  ].join(" ");

  return (
    <Group
      justify={justify}
      mt={mt}
      className={className}
      // Down through the padding below the page's content, to the very
      // foot of the scrolling area, so no text shows beneath the pair.
      bottom={sticky ? LAYOUT_STICKY_BOTTOM : undefined}
      data-sticky={sticky || undefined}
    >
      <Button
        type={acceptType}
        onClick={acceptDisabled ? (e: React.MouseEvent) => e.preventDefault() : onAccept}
        loading={acceptLoading}
        aria-disabled={acceptDisabled || undefined}
        size="md"
        styles={{
          root: acceptDisabled ? { opacity: 0.6, cursor: "default" } : undefined,
        }}
        data-testid={acceptTestId}
      >
        {acceptChildren ?? acceptLabel}
      </Button>
      {onCancel && (
        <SecondaryButton onClick={onCancel} disabled={cancelDisabled}>
          {cancelLabel}
        </SecondaryButton>
      )}
    </Group>
  );
}
