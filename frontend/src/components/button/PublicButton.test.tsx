import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import PublicButton from "./PublicButton";

describe("PublicButton", () => {
  describe("Basic rendering", () => {
    it("renders children text", () => {
      renderWithMantine(<PublicButton>Click me</PublicButton>);
      expect(screen.getByText("Click me")).toBeInTheDocument();
    });

    it("renders as a button by default", () => {
      renderWithMantine(<PublicButton>Action</PublicButton>);
      expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    });

    it("renders as a link when href is provided", () => {
      renderWithMantine(<PublicButton href="https://example.com">Link</PublicButton>);
      const link = screen.getByRole("link", { name: "Link" });
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("renders as a button when href is provided but disabled", () => {
      renderWithMantine(
        <PublicButton href="https://example.com" disabled>
          Disabled link
        </PublicButton>,
      );
      expect(screen.getByRole("button", { name: "Disabled link" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });
  });

  describe("Size variants", () => {
    it("renders with default md size", () => {
      renderWithMantine(<PublicButton>Medium</PublicButton>);
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("renders with sm size", () => {
      renderWithMantine(<PublicButton size="sm">Small</PublicButton>);
      expect(screen.getByText("Small")).toBeInTheDocument();
    });

    it("renders with lg size", () => {
      renderWithMantine(<PublicButton size="lg">Large</PublicButton>);
      expect(screen.getByText("Large")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("renders filled variant by default", () => {
      renderWithMantine(<PublicButton>Filled</PublicButton>);
      expect(screen.getByRole("button", { name: "Filled" })).toBeInTheDocument();
    });

    it("renders outline variant", () => {
      renderWithMantine(<PublicButton variant="outline">Outline</PublicButton>);
      expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    it.each(["filled", "outline"] as const)(
      "blocks clicks and keyboard activation for the disabled %s variant",
      async (variant) => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        renderWithMantine(
          <PublicButton href="https://example.com" variant={variant} disabled onClick={onClick}>
            Start review
          </PublicButton>,
        );
        const button = screen.getByRole("button", { name: "Start review" });
        await user.click(button);
        await user.keyboard("{Enter} ");
        expect(onClick).not.toHaveBeenCalled();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
      },
    );

    it("disables the button", () => {
      renderWithMantine(<PublicButton disabled>Disabled</PublicButton>);
      expect(screen.getByRole("button", { name: "Disabled" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });
  });
});
