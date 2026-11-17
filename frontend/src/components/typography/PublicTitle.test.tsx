import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import PublicTitle from "./PublicTitle";

describe("PublicTitle", () => {
  describe("Basic rendering", () => {
    it("renders title in white", () => {
      renderWithMantine(<PublicTitle title="Test Title" />);
      const title = screen.getByText("Test Title");
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe("H1");
    });

    it("renders description when provided", () => {
      renderWithMantine(<PublicTitle title="Test" description="A subtitle" />);
      expect(screen.getByText("A subtitle")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const { container } = renderWithMantine(<PublicTitle title="Test Title" />);
      const texts = container.querySelectorAll(".mantine-Text-root");
      expect(texts).toHaveLength(0);
    });
  });

  describe("Size variants", () => {
    it("renders h1 for lg size (default)", () => {
      renderWithMantine(<PublicTitle title="Large" />);
      expect(screen.getByText("Large").tagName).toBe("H1");
    });

    it("renders h2 for md size", () => {
      renderWithMantine(<PublicTitle title="Medium" size="md" />);
      expect(screen.getByText("Medium").tagName).toBe("H2");
    });

    it("renders h3 for sm size", () => {
      renderWithMantine(<PublicTitle title="Small" size="sm" />);
      expect(screen.getByText("Small").tagName).toBe("H3");
    });
  });

  describe("Alignment", () => {
    it("defaults to center alignment", () => {
      renderWithMantine(<PublicTitle title="Centred" />);
      const title = screen.getByText("Centred");
      expect(title).toBeInTheDocument();
    });

    it("supports left alignment", () => {
      renderWithMantine(<PublicTitle title="Left" ta="left" />);
      expect(screen.getByText("Left")).toBeInTheDocument();
    });
  });

  describe("Accent parsing", () => {
    it("renders *marked* word as italic span", () => {
      const { container } = renderWithMantine(
        <PublicTitle title="Communication that *counts*!" />,
      );
      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe("counts");
      expect(span?.style.fontStyle).toBe("italic");
    });

    it("renders accent word in the specified accent colour", () => {
      const { container } = renderWithMantine(
        <PublicTitle title="Hello *world*!" accentColour="#FF0000" />,
      );
      const span = container.querySelector("span");
      expect(span?.style.color).toBe("rgb(255, 0, 0)");
    });

    it("renders title without markers unchanged", () => {
      const { container } = renderWithMantine(<PublicTitle title="No markers here" />);
      const span = container.querySelector("span");
      expect(span).toBeNull();
      expect(screen.getByText("No markers here")).toBeInTheDocument();
    });

    it("supports multiple accent words", () => {
      const { container } = renderWithMantine(
        <PublicTitle title="*Hello* beautiful *world*!" />,
      );
      const spans = container.querySelectorAll("span");
      expect(spans).toHaveLength(2);
      expect(spans[0]?.textContent).toBe("Hello");
      expect(spans[1]?.textContent).toBe("world");
    });
  });
});
