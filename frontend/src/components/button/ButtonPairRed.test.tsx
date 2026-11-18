/**
 * ButtonPairRed Component Tests
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import ButtonPairRed from "./ButtonPairRed";

describe("ButtonPairRed", () => {
  const defaultProps = {
    onAccept: vi.fn(),
    onCancel: vi.fn(),
  };

  describe("Rendering", () => {
    it("renders with default labels", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} />);
      expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("renders custom accept label", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} acceptLabel="Leave page" />);
      expect(screen.getByRole("button", { name: "Leave page" })).toBeInTheDocument();
    });

    it("renders custom cancel label", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} cancelLabel="Stay on page" />);
      expect(screen.getByRole("button", { name: "Stay on page" })).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onAccept when accept button is clicked", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      renderWithMantine(<ButtonPairRed {...defaultProps} onAccept={onAccept} />);

      await user.click(screen.getByRole("button", { name: "OK" }));
      expect(onAccept).toHaveBeenCalledOnce();
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderWithMantine(<ButtonPairRed {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe("Disabled states", () => {
    it("marks accept button as aria-disabled when acceptDisabled is true", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} acceptDisabled />);
      expect(screen.getByRole("button", { name: "OK" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    });

    it("prevents click when acceptDisabled is true", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      renderWithMantine(<ButtonPairRed {...defaultProps} onAccept={onAccept} acceptDisabled />);

      await user.click(screen.getByRole("button", { name: "OK" }));
      expect(onAccept).not.toHaveBeenCalled();
    });
  });

  describe("Loading state", () => {
    // Busy UI must not fire another action or submit a form (TH-001).
    it.each([
      { acceptLoading: true, acceptDisabled: false },
      { acceptLoading: false, acceptDisabled: true },
      { acceptLoading: true, acceptDisabled: true },
    ])("blocks mouse, keyboard and submit activation with %j", async (state) => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      const onCancel = vi.fn();
      const onSubmit = vi.fn();
      renderWithMantine(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <ButtonPairRed
            {...state}
            onAccept={onAccept}
            onCancel={onCancel}
            acceptType="submit"
          />
        </form>,
      );
      const accept = screen.getByRole("button", { name: "OK" });
      expect(accept).toHaveAttribute("aria-disabled", "true");
      await user.click(accept);
      await user.click(accept);
      accept.focus();
      expect(accept).toHaveFocus();
      await user.keyboard("{Enter} ");
      expect(onAccept).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it("announces busy state and accepts actions again once loading ends", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      const { rerender } = renderWithMantine(
        <ButtonPairRed onAccept={onAccept} onCancel={vi.fn()} acceptLoading />,
      );
      expect(screen.getByRole("button", { name: "OK" })).toHaveAttribute("aria-busy", "true");
      rerender(<ButtonPairRed onAccept={onAccept} onCancel={vi.fn()} />);
      const accept = screen.getByRole("button", { name: "OK" });
      expect(accept).not.toHaveAttribute("aria-busy");
      expect(accept).not.toHaveAttribute("aria-disabled");
      await user.click(accept);
      expect(onAccept).toHaveBeenCalledOnce();
    });

    it("shows loading spinner when acceptLoading is true", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} acceptLoading />);
      const acceptButton = screen.getByRole("button", { name: "OK" });
      expect(acceptButton.querySelector(".mantine-Loader-root")).toBeInTheDocument();
    });

    it("shows submittingLabel when acceptLoading is true", () => {
      renderWithMantine(
        <ButtonPairRed
          {...defaultProps}
          acceptLabel="Delete"
          submittingLabel="Deleting…"
          acceptLoading
        />,
      );
      expect(screen.getByText("Deleting…")).toBeInTheDocument();
    });

    it("falls back to acceptLabel when submittingLabel is not provided", () => {
      renderWithMantine(<ButtonPairRed {...defaultProps} acceptLabel="Remove" acceptLoading />);
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });
  });
});
