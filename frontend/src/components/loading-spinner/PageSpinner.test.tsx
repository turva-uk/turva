import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import PageSpinner from "./PageSpinner";

describe("PageSpinner", () => {
  it("tells screen readers it is loading", () => {
    renderWithMantine(<PageSpinner />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("can say what is loading", () => {
    renderWithMantine(<PageSpinner label="Loading hazards" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading hazards");
  });

  // Every whole-page wait must match, or the belt jumps as one hands
  // over to the next. The size and the place are fixed here and nowhere
  // else, so there are no props to vary them.
  it("draws the belt 8rem square", () => {
    renderWithMantine(<PageSpinner />);
    const belt = screen.getByRole("status").parentElement;

    expect(belt?.style.width).toContain("8rem");
    expect(belt?.style.height).toContain("8rem");
  });

  it("centres it in most of the screen's height", () => {
    renderWithMantine(<PageSpinner />);
    const centre = screen.getByRole("status").parentElement?.parentElement;

    expect(centre?.style.minHeight).toContain("60dvh");
  });
});
