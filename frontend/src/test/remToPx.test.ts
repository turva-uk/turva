/**
 * Tests for the remToPx assertion helper.
 *
 * jsdom 30 resolves relative lengths in computed styles, so assertions that
 * used to compare against an authored `rem` value now need the `px` the
 * browser would report. This helper does that conversion.
 */

import { describe, expect, it } from "vitest";
import { remToPx } from "./test-utils";

describe("remToPx", () => {
  it("converts a whole-number rem value", () => {
    expect(remToPx("8rem")).toBe("128px");
  });

  it("converts a fractional rem value", () => {
    expect(remToPx("0.25rem")).toBe("4px");
    expect(remToPx("16.25rem")).toBe("260px");
  });

  it("trims floating-point noise", () => {
    // 2.1 * 16 is 33.599999999999994 in binary floating point
    expect(remToPx("2.1rem")).toBe("33.6px");
  });

  it("converts each value of a shorthand", () => {
    expect(remToPx("0.5rem 1rem")).toBe("8px 16px");
  });

  it("handles negative values", () => {
    expect(remToPx("-1.5rem")).toBe("-24px");
  });

  it("leaves values in other units untouched", () => {
    expect(remToPx("100px")).toBe("100px");
    expect(remToPx("50%")).toBe("50%");
    expect(remToPx("auto")).toBe("auto");
    expect(remToPx("var(--mantine-font-size-md)")).toBe("var(--mantine-font-size-md)");
  });

  it("only converts the rem parts of a mixed shorthand", () => {
    expect(remToPx("1rem auto 2px")).toBe("16px auto 2px");
  });

  it("honours a custom root font size", () => {
    expect(remToPx("2rem", 10)).toBe("20px");
  });

  it("tolerates surrounding and repeated whitespace", () => {
    expect(remToPx("  0.5rem   1rem  ")).toBe("8px 16px");
  });
});
