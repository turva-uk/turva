/**
 * PasswordConfirmModal Component
 *
 * A confirmation that asks for the person's password before the action,
 * for a change a stolen session must not make on its own: turning
 * two-factor off, say. A `ConfirmModal` with a `PasswordField` beneath
 * its message.
 *
 * The password is handed to `onConfirm`. If that throws, its message is
 * shown under the field and the modal stays open, so a wrong password
 * can be typed again. An empty one is refused here, before any request.
 *
 * @example
 * ```tsx
 * <PasswordConfirmModal
 *   opened={confirming}
 *   onClose={() => setConfirming(false)}
 *   onConfirm={(password) => api.post("/auth/totp/disable", { password })}
 *   title="Turn off two-factor authentication"
 *   acceptLabel="Turn off"
 * >
 *   Signing in will ask for your password only.
 * </PasswordConfirmModal>
 * ```
 */

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import PasswordField from "@/components/form/PasswordField";

export interface PasswordConfirmModalProps {
  /** Controls modal visibility */
  opened: boolean;
  /** Called on Cancel or Escape, and once the action has succeeded */
  onClose: () => void;
  /** The action, given the password typed. Throw to stay open. */
  onConfirm: (password: string) => void | Promise<void>;
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
  /** Red (destructive) or blue accept button. Defaults to true */
  destructive?: boolean;
}

export default function PasswordConfirmModal({
  opened,
  onClose,
  onConfirm,
  children,
  title,
  acceptLabel = "Confirm",
  submittingLabel,
  icon,
  destructive = true,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();

  // Cleared each time it opens, so a password never waits in a closed
  // modal for the next person to use it. Adjusted during render, as
  // ConfirmModal does, so it never paints open with the old one.
  const [wasOpened, setWasOpened] = useState(opened);
  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) {
      setPassword("");
      setError(undefined);
    }
  }

  async function handleAccept(): Promise<void> {
    if (password === "") {
      setError("Enter your password");
      throw new Error("No password");
    }

    setError(undefined);

    try {
      await onConfirm(password);
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
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          error={error}
          data-autofocus
        />
      }
    >
      {children}
    </ConfirmModal>
  );
}
