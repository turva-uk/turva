/**
 * PreviousNextButton Component
 *
 * A right-aligned button pair for step-by-step navigation (e.g. assessments).
 * Shows Next/Submit (filled) before Previous (outline), matching the
 * ButtonPair convention of primary action first.
 * Previous is hidden when `onPrevious` is not provided.
 * Buttons go full-width on mobile, matching ButtonPair responsive behaviour.
 *
 * @example
 * ```tsx
 * <PreviousNextButton
 *   onPrevious={goBack}
 *   onNext={goForward}
 *   nextDisabled={!hasSelection}
 * />
 * ```
 */

import { Button, Group } from "@mantine/core";
import classes from "./ButtonPair.module.css";

interface PreviousNextButtonProps {
  /** Called when Previous is clicked (hidden when undefined) */
  onPrevious?: () => void;
  /** Called when the forward button is clicked */
  onNext: () => void;
  /** Label for the forward button (defaults to "Next") */
  nextLabel?: string;
  /** Disables the forward button */
  nextDisabled?: boolean;
  /** Shows a loading spinner on the forward button */
  nextLoading?: boolean;
}

export default function PreviousNextButton({
  onPrevious,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  nextLoading = false,
}: PreviousNextButtonProps) {
  return (
    <Group justify="flex-end" className={classes.group}>
      <Button
        onClick={nextDisabled ? (e: React.MouseEvent) => e.preventDefault() : onNext}
        loading={nextLoading}
        aria-disabled={nextDisabled || undefined}
        size="md"
        styles={{
          root: nextDisabled ? { opacity: 0.6, cursor: "default" } : undefined,
        }}
      >
        {nextLabel}
      </Button>
      {onPrevious && (
        <Button variant="outline" onClick={onPrevious} size="md">
          Previous
        </Button>
      )}
    </Group>
  );
}
