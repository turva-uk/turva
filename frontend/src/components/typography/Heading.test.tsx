/**
 * Heading Component Tests
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import Heading from "./Heading";

describe("Heading", () => {
  it("renders children", () => {
    renderWithMantine(<Heading>Hello world</Heading>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders as an h2 element", () => {
    renderWithMantine(<Heading>Heading</Heading>);
    expect(screen.getByText("Heading").tagName).toBe("H2");
  });

  it("is always an h2: the page's h1 is PageHeader", () => {
    renderWithMantine(<Heading>Section</Heading>);
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });
});
