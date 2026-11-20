import { describe, expect, it, vi } from "vitest";
import { assertA11yReports } from "../../.storybook/assert-a11y-reports";

const report = (result: unknown = { violations: [] }, status = "passed") => ({
  type: "a11y",
  version: 1,
  status,
  result,
});

describe("Storybook accessibility gate", () => {
  it("accepts a complete clean scan", () => {
    expect(() => assertA11yReports("Hazard form", [report()])).not.toThrow();
  });
  it.each([undefined, null, {}, [], [{ type: "other" }], [report(), report()]])(
    "rejects absent, unrelated or duplicated reports: %j",
    (reports) => {
      expect(() => assertA11yReports("Hazard form", reports)).toThrow(/accessibility report/);
    },
  );
  it.each([
    undefined,
    null,
    {},
    { error: new Error("axe failed") },
    { error: null },
    { violations: null },
    { violations: [null] },
    { violations: [{}] },
  ])("rejects an incomplete or failed result: %j", (result) => {
    expect(() =>
      assertA11yReports("Hazard form", [report(result === undefined ? {} : result)]),
    ).toThrow();
  });
  it.each(["failed", "warning", "unknown"])(
    "rejects a %s status with no violations",
    (status) => {
      expect(() =>
        assertA11yReports("Hazard form", [report({ violations: [] }, status)]),
      ).toThrow(/did not pass/);
    },
  );
  it("rejects an unrecognised report version", () => {
    expect(() => assertA11yReports("Hazard form", [{ ...report(), version: 2 }])).toThrow(
      /invalid/,
    );
  });
  it.each(["passed", "failed", "warning"])(
    "fails known violations even with %s status",
    (status) => {
      expect(() =>
        assertA11yReports("Hazard form", [
          report({ violations: [{ id: "color-contrast" }] }, status),
        ]),
      ).toThrow(/color-contrast/);
    },
  );
  it("keeps an explicit todo advisory, but never treats an execution error as a todo", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      assertA11yReports(
        "Hazard form",
        [report({ violations: [{ id: "color-contrast" }] }, "warning")],
        { test: "todo" },
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("color-contrast"));
      expect(() =>
        assertA11yReports("Hazard form", [report({ error: "axe failed" }, "failed")], {
          test: "todo",
        }),
      ).toThrow(/failed to execute/);
    } finally {
      warn.mockRestore();
    }
  });
  it.each([{ test: "off" as const }, { disable: true }])(
    "preserves an explicit story exception: %j",
    (settings) => {
      expect(() => assertA11yReports("Hazard form", [], settings)).not.toThrow();
    },
  );
});
