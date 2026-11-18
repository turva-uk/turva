import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import BodyTextInline from "./BodyTextInline";

describe("BodyTextInline", () => {
  it("renders children text", () => {
    renderWithMantine(<BodyTextInline>Hello world</BodyTextInline>);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    renderWithMantine(<BodyTextInline>Inline text</BodyTextInline>);

    const element = screen.getByText("Inline text");
    expect(element.tagName).toBe("SPAN");
  });

  it("preserves whitespace for multiline messages", () => {
    renderWithMantine(<BodyTextInline>{"Line one\nLine two"}</BodyTextInline>);

    const element = screen.getByText(/Line one/);
    expect(element).toHaveStyle({ whiteSpace: "pre-wrap" });
  });

  it("stays at body weight unless asked", () => {
    // The default has to be unchanged: every existing caller renders
    // ordinary body text and none of them pass this prop.
    renderWithMantine(<BodyTextInline>Ordinary</BodyTextInline>);

    expect(screen.getByText("Ordinary")).toHaveStyle({ fontWeight: "500" });
  });

  it("emphasises a name inside a sentence when asked", () => {
    // `BodyTextBold` renders a block, so it cannot carry a name in the
    // middle of a line without breaking the sentence around it.
    renderWithMantine(<BodyTextInline bold>Dr Okonkwo</BodyTextInline>);

    const element = screen.getByText("Dr Okonkwo");
    expect(element).toHaveStyle({ fontWeight: "700" });
    expect(element.tagName).toBe("SPAN");
  });
});
