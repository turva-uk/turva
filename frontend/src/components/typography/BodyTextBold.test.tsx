/**
 * BodyTextBold Component Tests
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import BodyTextBold from "./BodyTextBold";

describe("BodyTextBold", () => {
  it("renders children", () => {
    renderWithMantine(<BodyTextBold>Hello world</BodyTextBold>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders as a paragraph element", () => {
    renderWithMantine(<BodyTextBold>Paragraph</BodyTextBold>);
    expect(screen.getByText("Paragraph").tagName).toBe("P");
  });

  it("defaults to left alignment", () => {
    renderWithMantine(<BodyTextBold>Left</BodyTextBold>);
    expect(screen.getByText("Left")).toHaveStyle({ textAlign: "left" });
  });

  it("applies centre alignment", () => {
    renderWithMantine(<BodyTextBold justify="centre">Centred</BodyTextBold>);
    expect(screen.getByText("Centred")).toHaveStyle({ textAlign: "center" });
  });

  it("applies right alignment", () => {
    renderWithMantine(<BodyTextBold justify="right">Right</BodyTextBold>);
    expect(screen.getByText("Right")).toHaveStyle({ textAlign: "right" });
  });
});
