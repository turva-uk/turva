/**
 * Dirty Form Navigation Warning Component
 *
 * Modal that warns users when attempting to navigate away from a page
 * with unsaved form changes. Uses React Router's useBlocker functionality.
 *
 * @module DirtyFormNavigation
 */

import { IconAlertTriangle } from "@/components/icons/appIcons";
import type { Blocker } from "react-router";
import { useRef } from "react";
import type { ReactNode } from "react";
import { ConfirmModal } from "@/components/confirm-modal";

/**
 * Props for DirtyFormNavigation component
 */
interface DirtyFormNavigationProps {
  /** Blocker object from React Router's useBlocker hook */
  blocker: Blocker;
  /** Callback function to execute before proceeding with navigation (e.g., clear dirty flag) */
  onProceed?: () => void;
  /**
   * What is about to be lost.
   *
   * Defaults to unsaved form changes, which is what most callers block
   * on. A page blocking on something else - a file still uploading -
   * says so here, because "unsaved changes" sends the admin looking
   * for a save button that is not there.
   */
  message?: ReactNode;
  /** Label on the leave button. */
  acceptLabel?: string;
}

/**
 * Dirty Form Navigation Warning Component
 *
 * Displays a confirmation modal when a user attempts to navigate away
 * from a form with unsaved changes. Provides options to stay on the page
 * or proceed with navigation (discarding changes).
 *
 * @example
 * ```tsx
 * const [dirty, setDirty] = useState(false);
 * const blocker = useBlocker(
 *   ({ currentLocation, nextLocation }) =>
 *     dirty && currentLocation.pathname !== nextLocation.pathname
 * );
 *
 * <DirtyFormNavigation
 *   blocker={blocker}
 *   onProceed={() => setDirty(false)}
 * />
 * ```
 *
 * @param props - Component props
 * @returns Modal component for navigation confirmation
 */
export default function DirtyFormNavigation({
  blocker,
  onProceed,
  message = "You have unsaved changes. Are you sure you want to leave this page?",
  acceptLabel = "Leave page",
}: DirtyFormNavigationProps) {
  const proceededRef = useRef(false);

  function handleProceed() {
    proceededRef.current = true;
    if (onProceed) {
      onProceed();
    }
    blocker.proceed?.();
  }

  function handleClose() {
    // ConfirmModal calls onClose after onAccept succeeds - skip reset if
    // we already proceeded (navigation is in progress).
    if (!proceededRef.current) {
      blocker.reset?.();
    }
    proceededRef.current = false;
  }

  return (
    <ConfirmModal
      opened={blocker.state === "blocked"}
      onClose={handleClose}
      onAccept={handleProceed}
      acceptLabel={acceptLabel}
      cancelLabel="Stay"
      icon={<IconAlertTriangle />}
    >
      {message}
    </ConfirmModal>
  );
}
