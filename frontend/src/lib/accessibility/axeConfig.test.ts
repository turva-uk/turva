import { describe, expect, it } from "vitest";
import { EXTRA_RULES, WCAG_TAGS } from "./axeConfig";

describe("axe baseline", () => {
  it("covers WCAG 2.0 to 2.2 at A and AA", () => {
    expect(WCAG_TAGS).toEqual(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  });

  it("switches on target size, which axe ships disabled", () => {
    expect(EXTRA_RULES).toContainEqual({ id: "target-size", enabled: true });
  });
});
