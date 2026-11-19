import { afterEach, describe, expect, it } from "vitest";
import { afterEach as runA11y } from "@storybook/addon-a11y/preview";
import { ReporterAPI } from "storybook/preview-api";
import { EXTRA_RULES, WCAG_TAGS } from "../src/lib/accessibility/axeConfig";
import { assertA11yReports } from "./assert-a11y-reports";

afterEach(() => {
  document.body.replaceChildren();
});

describe.each(["light", "dark"] as const)("real axe gate in %s mode", (scheme) => {
  function fixture(contrast = true) {
    document.documentElement.dataset.mantineColorScheme = scheme;
    const button = document.createElement("button");
    button.textContent = "Review hazard";
    button.style.cssText = `font-size: 19px; color: ${contrast ? "#111111" : "#999999"}; background: ${contrast ? "#ffffff" : "#777777"}`;
    document.body.append(button);
    return {
      id: `gate-${scheme}`,
      viewMode: "story",
      reporting: new ReporterAPI(),
      globals: { a11y: { manual: false } },
      parameters: {
        a11y: {
          test: "error",
          options: { runOnly: { type: "tag", values: [...WCAG_TAGS] } },
          config: { rules: [...EXTRA_RULES] },
        },
      },
    } as unknown as Parameters<typeof runA11y>[0];
  }

  it("requires a completed clean scan", async () => {
    const context = fixture();
    await runA11y(context);
    expect(() => assertA11yReports(context.id, context.reporting.reports)).not.toThrow();
    expect(context.reporting.reports).toHaveLength(1);
  });
  it("rejects known low contrast", async () => {
    const context = fixture(false);
    await expect(runA11y(context)).rejects.toThrow();
    expect(context.reporting.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "failed",
          result: expect.objectContaining({
            violations: expect.arrayContaining([
              expect.objectContaining({ id: "color-contrast" }),
            ]),
          }),
        }),
      ]),
    );
    expect(() => assertA11yReports(context.id, context.reporting.reports)).toThrow();
  });
  it("rejects real axe execution failure, not an empty violations list", async () => {
    const context = fixture();
    context.parameters.a11y.options.runOnly = { type: "rule", values: ["not-a-real-axe-rule"] };
    await expect(runA11y(context)).rejects.toThrow();
    expect(() => assertA11yReports(context.id, context.reporting.reports)).toThrow(
      /failed to execute/,
    );
  });
  it("rejects a skipped scan when the gate still requires one", async () => {
    const context = fixture();
    context.globals.a11y.manual = true;
    await runA11y(context);
    expect(() => assertA11yReports(context.id, context.reporting.reports)).toThrow(
      /expected one/,
    );
  });
});
