import { describe, expect, it } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import NavIcon from "./NavIcon";

describe("NavIcon Component", () => {
  describe("Icon rendering", () => {
    it("renders home icon", () => {
      const { container } = renderWithMantine(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders settings icon", () => {
      const { container } = renderWithMantine(<NavIcon name="settings" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders logout icon", () => {
      const { container } = renderWithMantine(<NavIcon name="logout" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders user icon", () => {
      const { container } = renderWithMantine(<NavIcon name="user" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders bell icon", () => {
      const { container } = renderWithMantine(<NavIcon name="bell" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders message icon", () => {
      const { container } = renderWithMantine(<NavIcon name="message" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders file icon", () => {
      const { container } = renderWithMantine(<NavIcon name="file" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders adjustments icon", () => {
      const { container } = renderWithMantine(<NavIcon name="adjustments" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Size variations", () => {
    it("renders with xs size", () => {
      const { container } = renderWithMantine(<NavIcon name="home" size="xs" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "10");
      expect(svg).toHaveAttribute("height", "10");
    });

    it("renders with sm size", () => {
      const { container } = renderWithMantine(<NavIcon name="home" size="sm" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "13");
      expect(svg).toHaveAttribute("height", "13");
    });

    it("renders with md size", () => {
      const { container } = renderWithMantine(<NavIcon name="home" size="md" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
    });

    it("renders with lg size (default)", () => {
      const { container } = renderWithMantine(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "22");
      expect(svg).toHaveAttribute("height", "22");
    });

    it("renders with xl size", () => {
      const { container } = renderWithMantine(<NavIcon name="home" size="xl" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "29");
      expect(svg).toHaveAttribute("height", "29");
    });
  });

  describe("Plain icon rendering (no ThemeIcon wrapper)", () => {
    it("renders icon directly without ThemeIcon wrapper", () => {
      const { container } = renderWithMantine(<NavIcon name="home" />);
      const themeIcon = container.querySelector(".mantine-ThemeIcon-root");
      expect(themeIcon).not.toBeInTheDocument();
    });

    it("renders SVG icon element", () => {
      const { container } = renderWithMantine(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("All icon names", () => {
    const iconNames = [
      "home",
      "settings",
      "logout",
      "user",
      "bell",
      "message",
      "file",
      "adjustments",
      "feedback",
      "safety",
    ] as const;

    iconNames.forEach((iconName) => {
      it(`renders ${iconName} icon without errors`, () => {
        const { container } = renderWithMantine(<NavIcon name={iconName} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("All size presets", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
    const expectedSizes = {
      xs: "10",
      sm: "13",
      md: "16",
      lg: "22",
      xl: "29",
    };

    sizes.forEach((size) => {
      it(`renders ${size} size correctly`, () => {
        const { container } = renderWithMantine(<NavIcon name="home" size={size} />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("width", expectedSizes[size]);
      });
    });
  });
});
