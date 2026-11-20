import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import PublicBodyText from "./PublicBodyText";

describe("PublicBodyText", () => {
  it("renders children", () => {
    renderWithMantine(<PublicBodyText>Hello world</PublicBodyText>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("defaults to gray.4 colour", () => {
    renderWithMantine(<PublicBodyText>Coloured text</PublicBodyText>);
    const el = screen.getByText("Coloured text");
    // The inline style, because jsdom resolves only the variables the theme defines.
    expect(el.style.color).toBe("var(--mantine-color-gray-4)");
  });

  it("allows colour override", () => {
    renderWithMantine(<PublicBodyText c="white">White text</PublicBodyText>);
    const el = screen.getByText("White text");
    expect(el.style.color).toBe("var(--mantine-color-white)");
  });

  it("supports centre alignment", () => {
    renderWithMantine(<PublicBodyText justify="centre">Centred</PublicBodyText>);
    const el = screen.getByText("Centred");
    expect(el).toHaveStyle({ textAlign: "center" });
  });

  it("defaults to left alignment", () => {
    renderWithMantine(<PublicBodyText>Left</PublicBodyText>);
    const el = screen.getByText("Left");
    expect(el).toHaveStyle({ textAlign: "left" });
  });
});
