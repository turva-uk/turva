/**
 * ConfirmModal Component Tests
 *
 * Tests for the confirmation modal covering:
 * - Rendering with all props combinations (icon, title, children)
 * - Button labels (defaults and custom)
 * - Accept handler (sync and async)
 * - Loading state during async accept
 * - Close on cancel
 * - Does not render when closed
 * - Error handling (stays open on reject)
 */

import { useState } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import ConfirmModal from "./ConfirmModal";
import { IconAlertTriangle } from "@tabler/icons-react";

describe("ConfirmModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onAccept: vi.fn(),
    children: "Are you sure?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children message when opened", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} opened={false} />);
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("shows a field beneath the message, outside its paragraph", () => {
    renderWithMantine(
      <ConfirmModal
        {...defaultProps}
        field={<input aria-label="Password" type="password" />}
      />,
    );

    const field = screen.getByLabelText("Password");
    expect(field).toBeInTheDocument();
    expect(field.closest("p")).toBeNull();
  });

  it("renders title when provided", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} title="Remove member" />);
    expect(screen.getByText("Remove member")).toBeInTheDocument();
  });

  it("names its dialog by its title, so a screen reader announces it", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} title="Remove member" />);

    expect(screen.getByRole("dialog", { name: "Remove member" })).toBeInTheDocument();
  });

  it("names a title-free dialog, including a caller's more specific label", () => {
    const { rerender } = renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole("dialog", { name: "Confirm action" })).toBeInTheDocument();

    rerender(<ConfirmModal {...defaultProps} aria-label="Discard changes" />);
    expect(screen.getByRole("dialog", { name: "Discard changes" })).toBeInTheDocument();
  });

  it.each(["", "   "])("keeps a non-empty name when title and aria-label are %j", (empty) => {
    renderWithMantine(<ConfirmModal {...defaultProps} title={empty} aria-label={empty} />);
    expect(screen.getByRole("dialog", { name: "Confirm action" })).toBeInTheDocument();
  });

  it("keeps the title a level two heading inside the name", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} title="Remove member" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Remove member" }),
    ).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} icon={<IconAlertTriangle />} />);
    // Icon is wrapped in our Icon component - check for svg
    expect(screen.getByText("Are you sure?").closest("[class*='Modal']")).toBeInTheDocument();
  });

  it("uses default button labels", () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("uses custom button labels", () => {
    renderWithMantine(
      <ConfirmModal {...defaultProps} acceptLabel="Delete" cancelLabel="Keep" />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithMantine(<ConfirmModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onAccept and onClose when accept is clicked (sync)", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onClose = vi.fn();
    renderWithMantine(<ConfirmModal {...defaultProps} onAccept={onAccept} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows loading state during async accept", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    const asyncAccept = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onClose = vi.fn();
    renderWithMantine(
      <ConfirmModal {...defaultProps} onAccept={asyncAccept} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    // Button should be disabled during loading and label changes
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirming…" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    // Resolve the promise
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve!());
    expect(onClose).toHaveBeenCalledOnce();
  });

  // A pending action cannot be cancelled, repeated or mistaken for the next
  // confirmation if a parent closes/reopens the same instance (TH-001).
  describe.each([true, false])("pending confirmation, destructive=%s", (destructive) => {
    function deferred() {
      let resolve!: () => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      return { promise, resolve, reject };
    }

    function acceptButton() {
      return within(screen.getByRole("dialog")).getAllByRole("button")[0]!;
    }

    it("guards repeated activation before React commits the busy state", async () => {
      const pending = deferred();
      const onAccept = vi.fn(() => pending.promise);
      const onClose = vi.fn();
      renderWithMantine(
        <ConfirmModal
          {...defaultProps}
          destructive={destructive}
          onAccept={onAccept}
          onClose={onClose}
        />,
      );
      const accept = acceptButton();
      act(() => {
        accept.click();
        accept.click();
      });
      expect(onAccept).toHaveBeenCalledOnce();
      await act(async () => pending.resolve());
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("blocks Cancel, Escape and repeat mouse/keyboard acceptance while pending", async () => {
      const user = userEvent.setup();
      const pending = deferred();
      const onAccept = vi.fn(() => pending.promise);
      const onClose = vi.fn();
      renderWithMantine(
        <ConfirmModal
          {...defaultProps}
          destructive={destructive}
          onAccept={onAccept}
          onClose={onClose}
        />,
      );

      await user.click(acceptButton());
      expect(acceptButton()).toHaveAttribute("aria-disabled", "true");
      const cancel = screen.getByRole("button", { name: "Cancel" });
      expect(cancel).toHaveAttribute("aria-disabled", "true");
      await user.click(cancel);
      cancel.focus();
      await user.keyboard("{Enter} ");
      await user.keyboard("{Escape}");
      await user.click(acceptButton());
      acceptButton().focus();
      await user.keyboard("{Enter} ");
      expect(onClose).not.toHaveBeenCalled();
      expect(onAccept).toHaveBeenCalledOnce();

      await act(async () => pending.resolve());
      expect(onClose).toHaveBeenCalledOnce();
    });

    it.each(["resolve", "reject"] as const)(
      "isolates an earlier %s after external close/reopen",
      async (outcome) => {
        const user = userEvent.setup();
        const pending = deferred();
        const onAccept = vi
          .fn()
          .mockReturnValueOnce(pending.promise)
          .mockResolvedValue(undefined);
        const onClose = vi.fn();
        const props = { ...defaultProps, destructive, onAccept, onClose };
        const { rerender } = renderWithMantine(<ConfirmModal {...props} />);

        await user.click(acceptButton());
        rerender(<ConfirmModal {...props} opened={false} />);
        rerender(<ConfirmModal {...props} opened />);
        expect(acceptButton()).toHaveAttribute("aria-disabled", "true");
        await user.click(acceptButton());
        expect(onAccept).toHaveBeenCalledOnce();

        await act(async () => {
          if (outcome === "resolve") pending.resolve();
          else pending.reject(new Error("Earlier request failed"));
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(acceptButton()).not.toHaveAttribute("aria-disabled", "true");
        await user.click(acceptButton());
        expect(onAccept).toHaveBeenCalledTimes(2);
        expect(onClose).toHaveBeenCalledOnce();
      },
    );

    it("ignores a completion after unmount", async () => {
      const user = userEvent.setup();
      const pending = deferred();
      const onClose = vi.fn();
      const { unmount } = renderWithMantine(
        <ConfirmModal
          {...defaultProps}
          destructive={destructive}
          onAccept={() => pending.promise}
          onClose={onClose}
        />,
      );
      await user.click(acceptButton());
      unmount();
      await act(async () => pending.resolve());
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // The same instance is reused: a parent keeps it mounted and flips
  // `opened`. It once came back with the button still disabled, reading
  // "Confirming…", because the reset after closing was missed.
  describe("opened a second time", () => {
    function Reused({ onAccept }: { onAccept: () => Promise<void> }) {
      const [opened, setOpened] = useState(false);
      return (
        <>
          <button onClick={() => setOpened(true)}>Save changes</button>
          <ConfirmModal
            {...defaultProps}
            opened={opened}
            onClose={() => setOpened(false)}
            onAccept={onAccept}
          />
        </>
      );
    }

    async function confirmOnce(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      await user.click(await screen.findByRole("button", { name: "Confirm" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }

    it("offers Confirm again, enabled, after a successful accept", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn().mockResolvedValue(undefined);
      renderWithMantine(<Reused onAccept={onAccept} />);

      await confirmOnce(user);
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      const confirm = await screen.findByRole("button", { name: "Confirm" });
      expect(confirm).not.toHaveAttribute("aria-disabled", "true");
      expect(screen.queryByRole("button", { name: "Confirming…" })).toBeNull();
    });

    it("can be accepted a second and a third time", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn().mockResolvedValue(undefined);
      renderWithMantine(<Reused onAccept={onAccept} />);

      await confirmOnce(user);
      await confirmOnce(user);
      await confirmOnce(user);

      expect(onAccept).toHaveBeenCalledTimes(3);
    });
  });

  it("stays open when onAccept rejects", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn().mockRejectedValue(new Error("Server error"));
    const onClose = vi.fn();
    renderWithMantine(<ConfirmModal {...defaultProps} onAccept={onAccept} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledOnce();
    });

    // onClose should NOT be called on error
    expect(onClose).not.toHaveBeenCalled();
    // Modal should still be visible
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onClose after async accept resolves", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    const asyncAccept = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onClose = vi.fn();
    renderWithMantine(
      <ConfirmModal {...defaultProps} onAccept={asyncAccept} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onClose).not.toHaveBeenCalled();

    resolve!();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
