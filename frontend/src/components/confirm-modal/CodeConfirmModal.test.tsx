import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import CodeConfirmModal, { type CodeConfirmModalProps } from "./CodeConfirmModal";

function renderModal(props: Partial<CodeConfirmModalProps> = {}) {
  const onConfirm = vi.fn<CodeConfirmModalProps["onConfirm"]>();
  const onClose = vi.fn<CodeConfirmModalProps["onClose"]>();

  renderWithMantine(
    <CodeConfirmModal
      opened
      onClose={onClose}
      onConfirm={onConfirm}
      title="Approve the safety case"
      acceptLabel="Approve"
      {...props}
    >
      You are approving the file as it stands now.
    </CodeConfirmModal>,
  );

  return { onConfirm, onClose };
}

describe("CodeConfirmModal", () => {
  it("is a dialog named by its title, with a code field", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Approve the safety case" })).toHaveTextContent(
      "You are approving the file as it stands now.",
    );
    expect(screen.getByLabelText("Authenticator code")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
  });

  it("hands the code to onConfirm", async () => {
    const { onConfirm } = renderModal();

    await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("123456"));
  });

  it("refuses anything but six digits before any request", async () => {
    const { onConfirm } = renderModal();

    await userEvent.type(screen.getByLabelText("Authenticator code"), "12a");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Enter the six-digit code from your authenticator app"),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows why a code was refused and stays open", async () => {
    renderModal({
      onConfirm: () => Promise.reject(new Error("That code was not accepted")),
    });

    await userEvent.type(screen.getByLabelText("Authenticator code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("That code was not accepted")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
