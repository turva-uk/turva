/**
 * BodyText Component Tests
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import BodyText from "./BodyText";

describe("BodyText", () => {
  it("renders children", () => {
    renderWithMantine(<BodyText>Hello world</BodyText>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders as a paragraph element", () => {
    renderWithMantine(<BodyText>Paragraph</BodyText>);
    expect(screen.getByText("Paragraph").tagName).toBe("P");
  });

  it("collapses line breaks unless asked to keep them", () => {
    renderWithMantine(<BodyText>{"First line\nSecond line"}</BodyText>);
    expect(screen.getByText("First line Second line")).not.toHaveStyle({
      whiteSpace: "pre-wrap",
    });
  });

  it("lets a word longer than the line break, with preserveLines", () => {
    // Typed text may hold a pasted address with nowhere to wrap.
    renderWithMantine(<BodyText preserveLines>https://example.com/a/very/long/path</BodyText>);

    expect(screen.getByText("https://example.com/a/very/long/path")).toHaveStyle({
      overflowWrap: "anywhere",
    });
  });

  it("leaves ordinary text to wrap at its spaces", () => {
    renderWithMantine(<BodyText>Ordinary text</BodyText>);

    expect(screen.getByText("Ordinary text")).not.toHaveStyle({
      overflowWrap: "anywhere",
    });
  });

  it("keeps line breaks with preserveLines", () => {
    renderWithMantine(<BodyText preserveLines>{"First line\nSecond line"}</BodyText>);
    expect(screen.getByText("First line Second line")).toHaveStyle({
      whiteSpace: "pre-wrap",
    });
  });
});
