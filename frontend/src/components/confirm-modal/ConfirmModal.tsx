/**
 * ConfirmModal Component
 *
 * A reusable confirmation modal for destructive or irreversible actions.
 * Acts as a safety gate _before_ submission - not a post-action acknowledgement.
 *
 * @example
 * ```tsx
 * <ConfirmModal
 *   opened={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onAccept={handleRemoveStaff}
 *   title="Remove staff member"
 *   acceptLabel="Remove"
 *   icon={<IconAlertTriangle />}
 * >
 *   Are you sure you want to remove Dr Smith from this organisation?
 * </ConfirmModal>
 * ```
 */

import { Box, Modal, Stack, VisuallyHidden } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import ButtonPair from "@/components/button/ButtonPair";
import ButtonPairRed from "@/components/button/ButtonPairRed";
import Heading from "@/components/typography/Heading";
import BodyText from "@/components/typography/BodyText";
import Icon from "@/components/icons/Icon";

export interface ConfirmModalProps {
  /** Controls modal visibility */
  opened: boolean;
  /** Called on Cancel or Escape */
  onClose: () => void;
  /** Async-aware action handler; component manages loading state */
  onAccept: () => void | Promise<void>;
  /** Message body */
  children: ReactNode;
  /** Bold centred heading between icon and message */
  title?: string;
  /** Accessible name when no visible title is supplied. */
  "aria-label"?: string;
  /** Red action button label */
  acceptLabel?: string;
  /** Label shown on accept button during async operation (e.g. "Booking…") */
  submittingLabel?: string;
  /** Outline button label */
  cancelLabel?: string;
  /** Centred icon above title/message */
  icon?: ReactElement;
  /** Use red (destructive) or blue (non-destructive) accept button. Defaults to true */
  destructive?: boolean;
  /**
   * A field the action needs, beneath the message: a password, say.
   * Kept out of `children`, which is a paragraph and cannot hold one.
   */
  field?: ReactNode;
}

export default function ConfirmModal({
  opened,
  onClose,
  onAccept,
  children,
  title,
  "aria-label": ariaLabel = "Confirm action",
  acceptLabel = "Confirm",
  submittingLabel = "Confirming\u2026",
  cancelLabel = "Cancel",
  icon,
  destructive = true,
  field,
}: ConfirmModalProps) {
  const [phase, setPhase] = useState<"idle" | "pending" | "accepted">("idle");
  const loading = phase !== "idle";
  const inFlightRef = useRef(false);
  const sessionRef = useRef(0);
  const mountedRef = useRef(false);

  // A parent can close/reopen the instance or unmount it while a request is
  // pending. Its completion belongs to the original opening only. Keep the
  // pending gate until it settles, even across an external close/reopen.
  useLayoutEffect(() => {
    mountedRef.current = true;
    sessionRef.current += 1;
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
    };
  }, [opened]);

  const handleAccept = useCallback(async () => {
    if (!opened || loading || inFlightRef.current) return;
    inFlightRef.current = true;
    const session = sessionRef.current;
    setPhase("pending");
    let succeeded = false;
    try {
      await onAccept();
      succeeded = true;
    } catch {
      // Stay open - caller handles error display
    } finally {
      inFlightRef.current = false;
    }
    if (!mountedRef.current) return;
    if (!succeeded || session !== sessionRef.current) {
      setPhase("idle");
      return;
    }
    setPhase("accepted");
    onClose();
  }, [opened, loading, onAccept, onClose]);

  const handleClose = useCallback(() => {
    if (!loading && !inFlightRef.current) onClose();
  }, [loading, onClose]);

  // `loading` is left on after a successful accept, so the button does not
  // flick back to its resting label while the modal fades out. It must be
  // off again by the next time the modal opens, unless an earlier request
  // is still pending. The parent usually keeps the same instance mounted.
  //
  // Two resets, because the first has been missed before. This used to
  // hang off `onTransitionEnd`, which Mantine's Modal does not have: it
  // fell through to the DOM as the browser's `transitionend` event, and
  // that races the timer Mantine unmounts the modal on. When the unmount
  // won, or there was no animation at all (reduced motion), nothing
  // cleared `loading` and the button came back disabled, reading
  // "Confirming…", until the page was left.
  const handleExited = useCallback(() => {
    if (!inFlightRef.current) setPhase("idle");
  }, []);

  // Adjusted during render rather than in an effect, so the modal never
  // paints open with the stale state.
  const [wasOpened, setWasOpened] = useState(opened);
  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened && phase === "accepted") setPhase("idle");
  }

  const hasTitle = !!title?.trim();

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      closeOnClickOutside={false}
      closeOnEscape={!loading}
      withCloseButton={false}
      centered
      size="lg"
      onExitTransitionEnd={handleExited}
    >
      <Stack gap="md" py="md">
        {icon && (
          <Box ta="center" mb="calc(-1 * var(--mantine-spacing-xs))">
            <Icon icon={icon} size="xl" colour="var(--alert-color)" />
          </Box>
        )}
        {/*
          Mantine's modal title, so the dialog is named by it
          (`aria-labelledby`) and a screen reader announces "Delete site,
          dialog" rather than an unnamed dialog. Drawn as a plain wrapper
          round our own heading, which stays the h2. A title-free dialog
          still needs this association: aria-label on Modal names its root
          wrapper, not the section with role="dialog".
        */}
        <Modal.Title
          renderRoot={(props) =>
            hasTitle ? <div {...props} /> : <VisuallyHidden {...props} />
          }
        >
          {hasTitle ? (
            <Heading justify="centre">{title}</Heading>
          ) : (
            ariaLabel.trim() || "Confirm action"
          )}
        </Modal.Title>
        <BodyText justify="centre">{children}</BodyText>
        {field}
        {destructive ? (
          <ButtonPairRed
            onAccept={handleAccept}
            onCancel={handleClose}
            acceptLabel={acceptLabel}
            submittingLabel={submittingLabel}
            cancelLabel={cancelLabel}
            acceptDisabled={loading}
            acceptLoading={loading}
            cancelDisabled={loading}
            justify="center"
          />
        ) : (
          <ButtonPair
            onAccept={handleAccept}
            onCancel={handleClose}
            acceptLabel={acceptLabel}
            cancelLabel={cancelLabel}
            acceptLoading={loading}
            acceptDisabled={loading}
            cancelDisabled={loading}
            justify="center"
          />
        )}
      </Stack>
    </Modal>
  );
}
