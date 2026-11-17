import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import PasswordConfirmModal, { type PasswordConfirmModalProps } from "./PasswordConfirmModal";

function renderModal(props: Partial<PasswordConfirmModalProps> = {}) {
  const onConfirm = vi.fn<PasswordConfirmModalProps["onConfirm"]>();
  const onClose = vi.fn<PasswordConfirmModalProps["onClose"]>();

  renderWithMantine(
    <PasswordConfirmModal
      opened
      onClose={onClose}
      onConfirm={onConfirm}
      title="Turn off two-factor authentication"
      acceptLabel="Turn off"
      {...props}
    >
      Signing in will ask for your password only.
    </PasswordConfirmModal>,
  );

  return { onConfirm, onClose };
}

describe("PasswordConfirmModal", () => {
  it("is a dialog named by its title, with a password field", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", {
      name: "Turn off two-factor authentication",
    });
    expect(dialog).toHaveTextContent("Signing in will ask for your password only.");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("hands the password to the action, then closes", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();

    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Turn off" }));

    expect(onConfirm).toHaveBeenCalledWith("secret123");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("asks for a password rather than sending an empty one", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Turn off" }));

    expect(await screen.findByText("Enter your password")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says why the action failed and stays open to try again", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();
    onConfirm.mockRejectedValueOnce(new Error("Incorrect password"));

    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Turn off" }));

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Turn off" })).toBeEnabled();
  });

  it("cancels without the action", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
