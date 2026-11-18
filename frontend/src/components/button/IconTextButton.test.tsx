/**
 * IconTextButton Component Tests
 *
 * Tests for the IconTextButton component covering:
 * - Rendering with label and icon
 * - Click interactions
 * - Disabled state
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import IconTextButton from "./IconTextButton";

// Whether the screen is phone width, as the Icon reads it.
const phone = vi.hoisted(() => ({ value: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => phone.value };
});

describe("IconTextButton", () => {
  describe("Rendering", () => {
    it("renders with label text", () => {
      renderWithMantine(<IconTextButton icon="refresh" label="Sync all" />);
      expect(screen.getByRole("button", { name: /sync all/i })).toBeInTheDocument();
    });

    it("renders icon", () => {
      renderWithMantine(<IconTextButton icon="refresh" label="Sync all" />);
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("keeps its icon the same size on a phone", () => {
      // The button's own height does not shrink, so neither does its icon.
      phone.value = true;
      renderWithMantine(<IconTextButton icon="user" label="Their user account" />);
      phone.value = false;

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("width", "20");
    });
  });

  describe("Interactions", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      renderWithMantine(
        <IconTextButton icon="refresh" label="Sync all" onClick={handleClick} />,
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      renderWithMantine(
        <IconTextButton icon="refresh" label="Sync all" onClick={handleClick} disabled />,
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("States", () => {
    it("shows disabled state", () => {
      renderWithMantine(<IconTextButton icon="refresh" label="Sync all" disabled />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    });

    it("is interactive when not disabled", () => {
      renderWithMantine(<IconTextButton icon="refresh" label="Sync all" />);
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-disabled");
    });
  });

  describe("Labels", () => {
    it("renders different label variations", () => {
      const { rerender } = renderWithMantine(
        <IconTextButton icon="refresh" label="Sync all" />,
      );
      expect(screen.getByText("Sync all")).toBeInTheDocument();

      rerender(<IconTextButton icon="refresh" label="Refresh data" />);
      expect(screen.getByText("Refresh data")).toBeInTheDocument();
    });

    it("renders with arrowLeft icon", () => {
      renderWithMantine(<IconTextButton icon="arrowLeft" label="Back" />);
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("takes a fuller name for screen readers, keeping the label", () => {
      renderWithMantine(
        <IconTextButton icon="trash" label="Remove file" aria-label="Remove file als.pdf" />,
      );
      expect(screen.getByRole("button", { name: "Remove file als.pdf" })).toBeInTheDocument();
      expect(screen.getByText("Remove file")).toBeInTheDocument();
    });
  });
});
