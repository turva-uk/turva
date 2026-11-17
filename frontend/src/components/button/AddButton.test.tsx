/**
 * AddButton Component Tests
 *
 * Tests for the AddButton component covering:
 * - Rendering with label
 * - Click interactions
 * - Disabled state
 * - Icon rendering
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import AddButton from "./AddButton";

describe("AddButton", () => {
  describe("Rendering", () => {
    it("renders with label text", () => {
      renderWithMantine(<AddButton label="Add user" />);
      expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
    });

    it("renders plus icon", () => {
      renderWithMantine(<AddButton label="Add hazard" />);
      const button = screen.getByRole("button");
      // Check for SVG icon presence
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      renderWithMantine(<AddButton label="Add user" onClick={handleClick} />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      renderWithMantine(<AddButton label="Add user" onClick={handleClick} disabled />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("States", () => {
    it("shows disabled state", () => {
      renderWithMantine(<AddButton label="Add user" disabled />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("is interactive when not disabled", () => {
      renderWithMantine(<AddButton label="Add user" />);
      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });
  });

  describe("Labels", () => {
    it("renders different label variations", () => {
      const { rerender } = renderWithMantine(<AddButton label="Add user" />);
      expect(screen.getByText("Add user")).toBeInTheDocument();

      rerender(<AddButton label="Add hazard" />);
      expect(screen.getByText("Add hazard")).toBeInTheDocument();

      rerender(<AddButton label="Add record" />);
      expect(screen.getByText("Add record")).toBeInTheDocument();
    });
  });
});
