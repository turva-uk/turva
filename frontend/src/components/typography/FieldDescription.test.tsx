import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import FieldDescription from "./FieldDescription";

describe("FieldDescription", () => {
  it("renders children text", () => {
    renderWithMantine(<FieldDescription>Some description</FieldDescription>);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("can be nested inside Mantine's description paragraph", () => {
    renderWithMantine(<FieldDescription>Description text</FieldDescription>);
    const el = screen.getByText("Description text");
    expect(el.tagName).toBe("SPAN");
  });

  it("applies grey colour class", () => {
    renderWithMantine(<FieldDescription>Greyed text</FieldDescription>);
    const el = screen.getByText("Greyed text");
    expect(el.className).toContain("mantine");
  });
});
