import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import LiveStatus from "./LiveStatus";

describe("LiveStatus", () => {
  it("is a polite status region", () => {
    renderWithMantine(<LiveStatus message="Loading" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toHaveTextContent("Loading");
  });

  it("stays mounted, empty, when there is nothing to say", () => {
    renderWithMantine(<LiveStatus message="" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("changes its text in place, so the change is announced", () => {
    const { rerender } = renderWithMantine(<LiveStatus message="Loading" />);
    const region = screen.getByRole("status");
    rerender(<LiveStatus message="3 results" />);
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("3 results");
  });
});
