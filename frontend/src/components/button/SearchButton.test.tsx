import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import SearchButton from "./SearchButton";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

describe("SearchButton", () => {
  describe("Touch target", () => {
    it("is 34px (Mantine lg) on desktop", () => {
      renderWithMantine(<SearchButton onClick={vi.fn()} />);
      const button = screen.getByRole("button", { name: "Open search" });
      expect(button.style.getPropertyValue("--ai-size")).toBe("var(--ai-size-lg)");
    });

    it("is 44px below the sm breakpoint", () => {
      media.isMobile = true;
      renderWithMantine(<SearchButton onClick={vi.fn()} />);
      const button = screen.getByRole("button", { name: "Open search" });
      expect(button.style.getPropertyValue("--ai-size")).toContain("2.75rem");
    });
  });
  it("renders with accessible label", () => {
    renderWithMantine(<SearchButton onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Open search" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithMantine(<SearchButton onClick={handleClick} />);
    await user.click(screen.getByRole("button", { name: "Open search" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("shows a Search tooltip on hover", async () => {
    renderWithMantine(<SearchButton onClick={vi.fn()} />);
    await userEvent.hover(screen.getByLabelText("Open search"));
    expect(await screen.findByText("Search")).toBeInTheDocument();
  });
});
