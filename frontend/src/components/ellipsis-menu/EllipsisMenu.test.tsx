/**
 * EllipsisMenu Component Tests
 *
 * Tests for the EllipsisMenu dropdown action menu.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { IconTrash, IconPencil } from "@/components/icons/appIcons";
import EllipsisMenu from "./EllipsisMenu";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

describe("EllipsisMenu", () => {
  it("does not offer an empty action menu", () => {
    renderWithMantine(<EllipsisMenu aria-label="Actions" items={[]} />);
    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("uses readable status foregrounds instead of filled-badge colours", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <EllipsisMenu
        aria-label="Actions"
        items={[
          { label: "Delete", color: "var(--alert-color)", onClick: vi.fn() },
          { label: "Custom", color: "#123456", onClick: vi.fn() },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect((await screen.findByRole("menuitem", { name: "Delete" })).style.color).toBe(
      "var(--alert-text-color)",
    );
    expect(screen.getByRole("menuitem", { name: "Custom" })).toHaveStyle({ color: "#123456" });
    expect(
      screen.getByRole("menu").querySelector('[role="presentation"][tabindex]'),
    ).toBeNull();
  });

  describe("Touch target", () => {
    const renderMenu = () =>
      renderWithMantine(
        <EllipsisMenu aria-label="Actions" items={[{ label: "Edit", onClick: vi.fn() }]} />,
      );

    it("keeps a 30px trigger with a 20px icon on desktop", () => {
      renderMenu();
      const trigger = screen.getByRole("button", { name: "Actions" });
      expect(trigger.style.getPropertyValue("--ai-size")).toContain("1.875rem");
      expect(trigger.querySelector("svg")).toHaveAttribute("width", "20");
    });

    it("has a 44px trigger with a 20px icon below the sm breakpoint", () => {
      media.isMobile = true;
      renderMenu();
      const trigger = screen.getByRole("button", { name: "Actions" });
      expect(trigger.style.getPropertyValue("--ai-size")).toContain("2.75rem");
      expect(trigger.querySelector("svg")).toHaveAttribute("width", "20");
    });

    it("gives each item the class that makes it 44px tall on phones", async () => {
      const user = userEvent.setup();
      renderMenu();
      await user.click(screen.getByRole("button", { name: "Actions" }));
      expect((await screen.findByRole("menuitem", { name: "Edit" })).className).toMatch(
        /touchItem/,
      );
    });
  });

  it("renders the trigger button with aria-label", () => {
    renderWithMantine(
      <EllipsisMenu aria-label="Actions" items={[{ label: "Edit", onClick: vi.fn() }]} />,
    );

    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
  });

  it("shows menu items when clicked", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <EllipsisMenu
        aria-label="Actions"
        items={[
          { label: "Edit", onClick: vi.fn() },
          { label: "Delete", color: "var(--alert-color)", onClick: vi.fn() },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onClick when a menu item is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    renderWithMantine(
      <EllipsisMenu
        aria-label="Actions"
        items={[
          { label: "Edit", onClick: handleEdit },
          {
            label: "Delete",
            color: "var(--alert-color)",
            onClick: handleDelete,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByText("Delete"));

    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleEdit).not.toHaveBeenCalled();
  });

  it("renders menu items with icons", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <EllipsisMenu
        aria-label="Actions"
        items={[
          { label: "Edit", icon: <IconPencil />, onClick: vi.fn() },
          {
            label: "Delete",
            icon: <IconTrash />,
            color: "var(--alert-color)",
            onClick: vi.fn(),
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders a single menu item", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    renderWithMantine(
      <EllipsisMenu
        aria-label="Staff actions"
        items={[
          {
            label: "Remove from organisation",
            color: "var(--alert-color)",
            onClick: handleRemove,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Staff actions" }));
    await user.click(screen.getByText("Remove from organisation"));

    expect(handleRemove).toHaveBeenCalledOnce();
  });
});
