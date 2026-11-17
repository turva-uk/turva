/**
 * SortChevron Component Tests
 *
 * Tests for the SortChevron component covering:
 * - Rendering in each direction state
 * - Correct active/inactive styling per state
 * - aria-hidden for decorative usage
 */

import { describe, it, expect } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import SortChevron from "./SortChevron";

describe("SortChevron", () => {
  it("renders with aria-hidden", () => {
    const { container } = renderWithMantine(<SortChevron direction="neutral" />);
    const wrapper = container.querySelector("[aria-hidden='true']");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders two chevron spans", () => {
    const { container } = renderWithMantine(<SortChevron direction="neutral" />);
    const spans = container.querySelectorAll("[aria-hidden='true'] > span");
    expect(spans).toHaveLength(2);
  });

  it("marks up chevron active when direction is up", () => {
    const { container } = renderWithMantine(<SortChevron direction="up" />);
    const spans = container.querySelectorAll("[aria-hidden='true'] > span");
    expect(spans[0]?.className).toContain("active");
    expect(spans[1]?.className).toContain("inactive");
  });

  it("marks down chevron active when direction is down", () => {
    const { container } = renderWithMantine(<SortChevron direction="down" />);
    const spans = container.querySelectorAll("[aria-hidden='true'] > span");
    expect(spans[0]?.className).toContain("inactive");
    expect(spans[1]?.className).toContain("active");
  });

  it("marks both inactive when direction is neutral", () => {
    const { container } = renderWithMantine(<SortChevron direction="neutral" />);
    const spans = container.querySelectorAll("[aria-hidden='true'] > span");
    expect(spans[0]?.className).toContain("inactive");
    expect(spans[1]?.className).toContain("inactive");
  });
});
