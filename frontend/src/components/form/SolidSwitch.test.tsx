import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import SolidSwitch from "./SolidSwitch";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

describe("SolidSwitch", () => {
  describe("Rendering", () => {
    it("renders with a top label", () => {
      renderWithMantine(<SolidSwitch label="Toggle me" />);
      expect(screen.getByText("Toggle me")).toBeInTheDocument();
    });

    it("renders with a description below the switch", () => {
      renderWithMantine(<SolidSwitch label="Feature" description="Enable this feature" />);
      expect(screen.getByText("Enable this feature")).toBeInTheDocument();
    });

    it("renders unchecked by default", () => {
      renderWithMantine(<SolidSwitch label="Toggle" />);
      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("renders checked when checked prop is true", () => {
      renderWithMantine(<SolidSwitch label="Toggle" checked readOnly />);
      expect(screen.getByRole("switch")).toBeChecked();
    });

    it("shows 'No' label when unchecked", () => {
      renderWithMantine(<SolidSwitch label="Toggle" />);
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("shows 'Yes' label when checked", () => {
      renderWithMantine(<SolidSwitch label="Toggle" checked readOnly />);
      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("always renders top label", () => {
      const { container } = renderWithMantine(<SolidSwitch label="Feature" />);
      expect(container.querySelector("[class*='topLabel']")).toBeInTheDocument();
    });

    it("does not render description when omitted", () => {
      const { container } = renderWithMantine(<SolidSwitch label="Feature" />);
      expect(container.querySelector("[class*='description']")).not.toBeInTheDocument();
    });
  });

  describe("Solid thumb style", () => {
    it("applies the solid thumb class to remove inner ring", () => {
      const { container } = renderWithMantine(<SolidSwitch label="Toggle" />);
      const thumb = container.querySelector("[class*='thumb']");
      expect(thumb).toBeInTheDocument();
    });

    it("preserves custom classNames alongside solid thumb", () => {
      const { container } = renderWithMantine(
        <SolidSwitch label="Toggle" classNames={{ root: "custom-root" }} />,
      );
      const root = container.querySelector(".custom-root");
      expect(root).toBeInTheDocument();
    });
  });

  describe("Touch target", () => {
    it("pads the tappable body at size xl", () => {
      const { container } = renderWithMantine(<SolidSwitch label="Toggle" size="xl" />);
      expect(container.querySelector("label[class*='bodyXl']")).toBeInTheDocument();
    });

    it("defaults to xl below the sm breakpoint", () => {
      media.isMobile = true;
      const { container } = renderWithMantine(<SolidSwitch label="Toggle" />);
      expect(container.querySelector("label[class*='bodyXl']")).toBeInTheDocument();
    });

    it("keeps an explicit size below the sm breakpoint", () => {
      media.isMobile = true;
      const { container } = renderWithMantine(<SolidSwitch label="Toggle" size="sm" />);
      expect(container.querySelector("[class*='bodyXl']")).not.toBeInTheDocument();
    });

    it("leaves the body unpadded at the desktop default", () => {
      const { container } = renderWithMantine(<SolidSwitch label="Toggle" />);
      expect(container.querySelector("[class*='bodyXl']")).not.toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onChange when clicked", async () => {
      const user = userEvent.setup();
      let checked = false;
      renderWithMantine(
        <SolidSwitch
          label="Toggle"
          checked={checked}
          onChange={(e) => {
            checked = e.currentTarget.checked;
          }}
        />,
      );
      await user.click(screen.getByRole("switch"));
      expect(checked).toBe(true);
    });

    it("does not fire onChange when disabled", async () => {
      const user = userEvent.setup();
      let changed = false;
      renderWithMantine(
        <SolidSwitch
          label="Toggle"
          disabled
          onChange={() => {
            changed = true;
          }}
        />,
      );
      await user.click(screen.getByRole("switch"));
      expect(changed).toBe(false);
    });
  });

  describe("Size variants", () => {
    it.each(["xs", "sm", "md", "lg", "xl"] as const)("renders with %s size", (size) => {
      renderWithMantine(<SolidSwitch label="Toggle" size={size} />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });
});
