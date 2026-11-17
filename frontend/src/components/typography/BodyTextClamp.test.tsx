import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import BodyTextClamp from "./BodyTextClamp";

describe("BodyTextClamp", () => {
  it("renders children text", () => {
    renderWithMantine(<BodyTextClamp lineClamp={2}>Hello world</BodyTextClamp>);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("applies lineClamp attribute", () => {
    renderWithMantine(<BodyTextClamp lineClamp={3}>Some text</BodyTextClamp>);

    const element = screen.getByText("Some text");
    expect(element).toHaveAttribute("data-line-clamp", "true");
  });

  it("inherits default text colour", () => {
    renderWithMantine(<BodyTextClamp lineClamp={2}>Clamped text</BodyTextClamp>);

    const element = screen.getByText("Clamped text");
    expect(element).toHaveClass("mantine-Text-root");
  });
});
