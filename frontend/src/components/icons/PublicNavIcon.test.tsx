import { describe, expect, it } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import PublicNavIcon from "./PublicNavIcon";
import { PUBLIC_ICON_STROKE } from "./publicIconStroke";

describe("PublicNavIcon Component", () => {
  describe("Icon rendering", () => {
    const iconNames = [
      "home",
      "teaching",
      "learning",
      "assessments",
      "educators",
      "book",
      "pricing",
      "database",
      "mail",
    ] as const;

    iconNames.forEach((iconName) => {
      it(`renders ${iconName} icon`, () => {
        const { container } = renderWithMantine(<PublicNavIcon name={iconName} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("Size variations", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
    const expectedSizes: Record<string, string> = {
      xs: "10",
      sm: "13",
      md: "16",
      lg: "22",
      xl: "29",
    };

    sizes.forEach((size) => {
      it(`renders ${size} size correctly`, () => {
        const { container } = renderWithMantine(<PublicNavIcon name="home" size={size} />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("width", expectedSizes[size]);
      });
    });

    it("defaults to lg size", () => {
      const { container } = renderWithMantine(<PublicNavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "22");
    });
  });

  describe("ThemeIcon wrapper", () => {
    it("wraps icon in ThemeIcon component", () => {
      const { container } = renderWithMantine(<PublicNavIcon name="home" />);
      const themeIcon = container.querySelector(".mantine-ThemeIcon-root");
      expect(themeIcon).toBeInTheDocument();
    });

    it("uses transparent variant for background", () => {
      const { container } = renderWithMantine(<PublicNavIcon name="home" />);
      const themeIcon = container.querySelector(".mantine-ThemeIcon-root") as HTMLElement;
      expect(themeIcon).toHaveAttribute("data-variant", "transparent");
    });

    it("draws at the public site's icon stroke", () => {
      const { container } = renderWithMantine(<PublicNavIcon name="home" />);
      expect(container.querySelector("svg")).toHaveAttribute(
        "stroke-width",
        String(PUBLIC_ICON_STROKE),
      );
    });

    it("applies amber icon colour via CSS variable", () => {
      const { container } = renderWithMantine(<PublicNavIcon name="home" />);
      const svg = container.querySelector("svg") as SVGElement;
      expect(svg.getAttribute("stroke")).toBe("var(--mantine-color-secondary-4)");
    });
  });
});
