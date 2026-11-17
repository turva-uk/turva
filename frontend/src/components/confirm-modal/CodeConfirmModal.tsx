/**
 * CodeConfirmModal Component
 *
 * A confirmation that asks for the person's authenticator code before
 * the action: step-up for an act that is theirs alone to make, such as
 * signing a safety case. A `ConfirmModal` with a code field beneath its
 * message, as `PasswordConfirmModal` has a password field.
 *
 * The code is handed to `onConfirm`. If that throws, its message is shown
 * under the field and the modal stays open, so a mistyped code can be
 * entered again. Anything but six digits is refused here, before any
 * request.
 *
 * @example
 * ```tsx
 * <CodeConfirmModal
 *   opened={signing}
 *   onClose={() => setSigning(false)}
 *   onConfirm={(code) => signOff(file.id, "approved", code, head)}
 *   title="Approve the safety case"
 *   acceptLabel="Approve"
 * >
 *   You are approving the file as it stands now.
 * </CodeConfirmModal>
 * ```
 */

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import TextField from "@/components/form/TextField";

export interface CodeConfirmModalProps {
  /** Controls modal visibility */
  opened: boolean;
  /** Called on Cancel or Escape, and once the action has succeeded */
  onClose: () => void;
  /** The action, given the six-digit code typed. Throw to stay open. */
  onConfirm: (code: string) => void | Promise<void>;
  /** Message body */
  children: ReactNode;
  /** Bold centred heading, which names the dialog */
  title: string;
  /** Accept button label */
  acceptLabel?: string;
  /** Accept button label while the action runs */
  submittingLabel?: string;
  /** Centred icon above the title */
  icon?: ReactElement;
  /** Red (destructive) or blue accept button. Defaults to false */
  destructive?: boolean;
}

export default function CodeConfirmModal({
  opened,
  onClose,
  onConfirm,
  children,
  title,
  acceptLabel = "Confirm",
  submittingLabel,
  icon,
  destructive = false,
}: CodeConfirmModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();

  // Cleared each time it opens, so a code never waits in a closed modal.
  // Adjusted during render, as PasswordConfirmModal does.
  const [wasOpened, setWasOpened] = useState(opened);
  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) {
      setCode("");
      setError(undefined);
    }
  }

  async function handleAccept(): Promise<void> {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your authenticator app");
      throw new Error("No code");
    }

    setError(undefined);

    try {
      await onConfirm(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work");
      throw err;
    }
  }

  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onAccept={handleAccept}
      title={title}
      acceptLabel={acceptLabel}
      submittingLabel={submittingLabel}
      icon={icon}
      destructive={destructive}
      field={
        <TextField
          label="Authenticator code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.currentTarget.value.trim())}
          error={error}
          data-autofocus
        />
      }
    >
      {children}
    </ConfirmModal>
  );
}
