import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import FieldDescription from "./FieldDescription";

describe("FieldDescription", () => {
  it("renders children text", () => {
    renderWithMantine(<FieldDescription>Some description</FieldDescription>);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("renders as a paragraph element", () => {
    renderWithMantine(<FieldDescription>Description text</FieldDescription>);
    const el = screen.getByText("Description text");
    expect(el.tagName).toBe("P");
  });

  it("applies grey colour class", () => {
    renderWithMantine(<FieldDescription>Greyed text</FieldDescription>);
    const el = screen.getByText("Greyed text");
    expect(el.className).toContain("mantine");
  });
});
