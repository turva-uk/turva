import fs from "node:fs";
import path from "node:path";

import { Anchor, DEFAULT_THEME, MantineProvider, mergeMantineTheme } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { legacyCssVariablesResolver, legacyTheme } from "./legacyTheme";
import { BRAND_TEXT, linkColourVariables } from "./theme";

/** WCAG 2.2 relative luminance of a `#rrggbb` colour. */
function luminance(colour: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.2 contrast ratio between two `#rrggbb` colours. */
function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );

  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

const merged = mergeMantineTheme(DEFAULT_THEME, legacyTheme);
const resolved = legacyCssVariablesResolver(merged);

describe("the existing pages keep their look", () => {
  it("uses Mantine's own fonts, sizes, headings and breakpoints", () => {
    expect(legacyTheme.fontFamily).toBeUndefined();
    expect(legacyTheme.fontSizes).toBeUndefined();
    expect(legacyTheme.headings).toBeUndefined();
    expect(legacyTheme.breakpoints).toBeUndefined();
    expect(merged.fontFamily).toBe(DEFAULT_THEME.fontFamily);
    expect(merged.fontSizes).toEqual(DEFAULT_THEME.fontSizes);
  });

  it("keeps the brand colour, its shades and the square corners", () => {
    expect(legacyTheme.primaryColor).toBe("turva");
    expect(legacyTheme.primaryShade).toEqual({ light: 6, dark: 7 });
    expect(legacyTheme.components?.["Button"]?.defaultProps).toEqual({ radius: 0 });
  });

  it("adds none of the shared components' variables", () => {
    expect(resolved.variables).toEqual({});
    expect(resolved.light["--card-bg"]).toBeUndefined();
    expect(resolved.light["--error-color"]).toBeUndefined();
    expect(resolved.dark["--mantine-color-dimmed"]).toBeUndefined();
  });
});

describe("links on the existing pages", () => {
  it("follow the scheme's link colour instead of a fixed colour", () => {
    expect(legacyTheme.components?.["Anchor"]).toBeUndefined();
    expect(resolved.light).toMatchObject(linkColourVariables.light);
    expect(resolved.dark).toMatchObject(linkColourVariables.dark);
  });

  it("keep BRAND_TEXT in light mode, as before", () => {
    expect(resolved.light["--link-color"]).toBe(BRAND_TEXT);
  });

  it("are at least 4.5:1 on the body in both colour schemes", () => {
    // Mantine writes its white as "#fff"; the light body is white.
    expect(contrast(resolved.light["--link-color"] ?? "", "#ffffff")).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(resolved.dark["--link-color"] ?? "", merged.colors.dark[7] ?? ""),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("render without an inline colour, so the variable decides", () => {
    render(
      <MantineProvider theme={legacyTheme} cssVariablesResolver={legacyCssVariablesResolver}>
        <Anchor href="/safety-files">Safety files</Anchor>
      </MantineProvider>,
    );

    expect(screen.getByRole("link", { name: "Safety files" }).style.color).toBe("");
  });
});

describe("the app's entry point", () => {
  const entry = fs.readFileSync(path.join(import.meta.dirname, "main.tsx"), "utf8");

  it("gives the app the legacy theme and its resolver", () => {
    expect(entry).toContain("theme={legacyTheme}");
    expect(entry).toContain("cssVariablesResolver={legacyCssVariablesResolver}");
    expect(entry).not.toMatch(/from "\.\/theme"/);
  });

  it("loads no fonts and no shared stylesheets, which would restyle every page", () => {
    const imports = [...entry.matchAll(/^import "([^"]+)";$/gm)].map((match) => match[1]);

    expect(imports).toEqual(["@mantine/core/styles.css"]);
  });
});
