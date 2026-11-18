/**
 * IconButton Component Tests
 *
 * Tests for the IconButton wrapper component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import IconButton from "./IconButton";
import { IconPencil, IconTrash, IconCheck } from "@/components/icons/appIcons";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

describe("IconButton", () => {
  it("renders a 42px container on desktop", () => {
    renderWithMantine(<IconButton icon={<IconPencil />} aria-label="Edit" />);

    const button = screen.getByRole("button", { name: "Edit" });
    expect(button).toHaveClass("mantine-ActionIcon-root");
    expect(button.style.getPropertyValue("--ai-size")).toContain("2.625rem");
  });

  it("renders a 48px container below the sm breakpoint", () => {
    media.isMobile = true;
    renderWithMantine(<IconButton icon={<IconPencil />} aria-label="Edit" />);

    const button = screen.getByRole("button", { name: "Edit" });
    expect(button.style.getPropertyValue("--ai-size")).toContain("3rem");
  });

  it("draws a 28px icon on desktop", () => {
    renderWithMantine(<IconButton icon={<IconPencil />} aria-label="Edit" />);

    const svg = screen.getByRole("button", { name: "Edit" }).querySelector("svg");
    expect(svg).toHaveAttribute("width", "28");
  });

  it("draws a 32px icon below the sm breakpoint", () => {
    media.isMobile = true;
    renderWithMantine(<IconButton icon={<IconPencil />} aria-label="Edit" />);

    const svg = screen.getByRole("button", { name: "Edit" }).querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
  });

  it("handles onClick events", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithMantine(
      <IconButton icon={<IconPencil />} onClick={handleClick} aria-label="Click me" />,
    );

    const button = screen.getByRole("button", { name: "Click me" });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom variant and color", () => {
    renderWithMantine(
      <IconButton
        icon={<IconTrash />}
        variant="filled"
        color="var(--alert-color)"
        aria-label="Delete"
      />,
    );

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toBeInTheDocument();
  });

  it("renders with different icon types", () => {
    const { rerender } = renderWithMantine(
      <IconButton icon={<IconPencil />} aria-label="Edit" />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    rerender(<IconButton icon={<IconCheck />} aria-label="Confirm" />);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("can be disabled", () => {
    renderWithMantine(
      <IconButton icon={<IconPencil />} disabled aria-label="Disabled button" />,
    );

    const button = screen.getByRole("button", { name: "Disabled button" });
    expect(button).toBeDisabled();
  });

  it("applies custom className", () => {
    renderWithMantine(
      <IconButton icon={<IconPencil />} className="custom-class" aria-label="Custom" />,
    );

    const button = screen.getByRole("button", { name: "Custom" });
    expect(button).toHaveClass("custom-class");
  });

  it("requires an aria-label, so no icon button goes unnamed", () => {
    // A type-level check: typecheck:all fails if aria-label ever becomes
    // optional again, because this directive would then be unused.
    // @ts-expect-error aria-label is required
    const unnamed = <IconButton icon={<IconPencil />} />;
    expect(unnamed).toBeTruthy();
  });
});
