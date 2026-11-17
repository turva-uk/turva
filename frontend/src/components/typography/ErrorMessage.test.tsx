import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import ErrorMessage from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("renders children text", () => {
    renderWithMantine(<ErrorMessage>Something went wrong</ErrorMessage>);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders with mantine Text root class", () => {
    renderWithMantine(<ErrorMessage>Error message</ErrorMessage>);

    const element = screen.getByText("Error message");
    expect(element).toHaveClass("mantine-Text-root");
  });

  it("renders with bold font weight", () => {
    renderWithMantine(<ErrorMessage>Bold error</ErrorMessage>);

    const element = screen.getByText("Bold error");
    expect(element).toHaveStyle({ fontWeight: 700 });
  });
});
