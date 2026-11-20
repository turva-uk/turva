/**
 * BurgerButton Component Tests
 *
 * Tests for the BurgerButton component covering:
 * - Rendering with correct aria attributes
 * - Click interactions
 * - Open/closed state labels
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import BurgerButton from "./BurgerButton";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

describe("BurgerButton", () => {
  describe("Touch target", () => {
    it("is 34px (Mantine lg) on desktop", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      const button = screen.getByRole("button", { name: "Open navigation" });
      expect(button.style.getPropertyValue("--ai-size")).toBe("var(--ai-size-lg)");
    });

    it("is 44px below the sm breakpoint", () => {
      media.isMobile = true;
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      const button = screen.getByRole("button", { name: "Open navigation" });
      expect(button.style.getPropertyValue("--ai-size")).toContain("2.75rem");
    });
  });
  describe("Brand colour", () => {
    it("takes its amber from the theme, so it follows the brand", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      const button = screen.getByRole("button", { name: "Open navigation" });

      expect(button.style.color).toBe("var(--mantine-color-secondary-5)");
      expect(button.style.getPropertyValue("--ai-hover-color")).toBe(
        "var(--mantine-color-secondary-5)",
      );
    });
  });

  describe("Rendering", () => {
    it("renders as a button", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders the menu icon", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("draws the menu icon at stroke 2.5 by default", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("stroke-width", "2.5");
    });

    it("draws the menu icon at the stroke it is given", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} stroke={1.5} />);
      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("stroke-width", "1.5");
    });
  });

  describe("Aria attributes", () => {
    it("has aria-label 'Open navigation' when closed", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
    });

    it("has aria-label 'Close navigation' when open", () => {
      renderWithMantine(<BurgerButton navOpen={true} onClick={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();
    });

    it("has aria-expanded false when closed", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    });

    it("has aria-expanded true when open", () => {
      renderWithMantine(<BurgerButton navOpen={true} onClick={vi.fn()} />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    });

    it("has aria-controls pointing to app-navbar", () => {
      renderWithMantine(<BurgerButton navOpen={false} onClick={vi.fn()} />);
      expect(screen.getByRole("button")).toHaveAttribute("aria-controls", "app-navbar");
    });
  });

  describe("Interactions", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      renderWithMantine(<BurgerButton navOpen={false} onClick={handleClick} />);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
