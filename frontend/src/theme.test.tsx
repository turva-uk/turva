import fs from "node:fs";
import path from "node:path";

import {
  Alert,
  Anchor,
  Badge,
  DEFAULT_THEME,
  MantineProvider,
  Modal,
  defaultCssVariablesResolver,
  mergeMantineTheme,
} from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import breakpoints from "./breakpoints.json";
import {
  BODY_FONT,
  brandColours,
  DARK_SURFACES,
  cssVariablesResolver,
  linkColourVariables,
  primaryScale,
  secondaryScale,
  statusColourValues,
  statusTextColourValues,
  theme,
  typographyTokens,
} from "./theme";

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

it("uses normal text colour for small alert headings, not low-contrast semantic ink", () => {
  render(
    <MantineProvider theme={theme}>
      <Alert color="yellow" title="Closing does not reduce risk">
        Recorded scores remain.
      </Alert>
    </MantineProvider>,
  );
  expect(
    screen
      .getByText("Closing does not reduce risk")
      .closest<HTMLElement>(".mantine-Alert-title")?.style.color,
  ).toBe("var(--mantine-color-text)");
});

describe("shared component tokens", () => {
  it("names Turva's own scales as primary and secondary, and nothing else", () => {
    expect(theme.colors?.["primary"]).toEqual([...primaryScale]);
    expect(theme.colors?.["secondary"]).toEqual([...secondaryScale]);
    expect(Object.keys(theme.colors ?? {})).toEqual(["primary", "secondary"]);
    expect(theme.primaryColor).toBe("primary");
  });

  it("takes each brand colour from the scales, so none is a new colour", () => {
    expect(brandColours.primary).toBe(primaryScale[6]);
    expect(brandColours.secondary).toBe(secondaryScale[6]);
    expect(brandColours.mark).toBe(primaryScale[6]);
  });

  it("gives the ink on the yellow at least 7:1 on every shade it may sit on", () => {
    for (const shade of [6, 7]) {
      expect(
        contrast(brandColours.accentInk, secondaryScale[shade] ?? ""),
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it("gives white text at least 4.5:1 on every status fill that takes it", () => {
    const whiteText: (keyof typeof statusColourValues)[] = [
      "success",
      "warning",
      "outstanding",
      "info",
      "accent",
      "alert",
    ];

    for (const name of whiteText) {
      expect(contrast("#ffffff", statusColourValues[name])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives dark text at least 4.5:1 on the fills that take it", () => {
    expect(contrast("#1a1a1a", statusColourValues.neutral)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#1a1a1a", statusColourValues.update)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives every light-mode status word at least 4.5:1 on white", () => {
    for (const colour of Object.values(statusTextColourValues.light)) {
      expect(contrast(colour, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sets 19px body text and the Atkinson Hyperlegible Next font", () => {
    expect(typographyTokens.fontSizes.md).toBe("1.1875rem");
    expect(theme.fontFamily).toBe(BODY_FONT);
    expect(BODY_FONT).toContain("Atkinson Hyperlegible Next Variable");
  });

  it("sets no text size below 19px, for text or headings", () => {
    const minimum = 1.1875; // rem, 19px
    const sizes = [
      ...Object.values(typographyTokens.fontSizes),
      ...Object.values(typographyTokens.headings).map((heading) => heading.fontSize),
    ];

    for (const size of sizes) {
      expect(size).toMatch(/^[\d.]+rem$/);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("gives Mantine's small sizes the 19px minimum too", () => {
    const resolved = cssVariablesResolver(mergeMantineTheme(DEFAULT_THEME, theme));

    expect(resolved.variables["--typo-xs"]).toBe("1.1875rem");
    expect(resolved.variables["--typo-sm"]).toBe("1.1875rem");
  });

  it("takes its breakpoints from breakpoints.json", () => {
    expect(theme.breakpoints).toEqual(breakpoints);
  });

  it("exposes the status and brand colours as CSS variables", () => {
    const resolved = cssVariablesResolver(mergeMantineTheme(DEFAULT_THEME, theme));

    expect(resolved.variables["--success-color"]).toBe(statusColourValues.success);
    expect(resolved.variables["--brand-primary"]).toBe(primaryScale[6]);
    expect(resolved.light["--success-text-color"]).toBe(statusTextColourValues.light.success);
    expect(resolved.dark["--success-text-color"]).toBe(statusTextColourValues.dark.success);
  });

  it("gives dimmed text at least 4.5:1 on the dark body and card in dark mode", () => {
    const merged = mergeMantineTheme(DEFAULT_THEME, theme);
    const dimmed = cssVariablesResolver(merged).dark["--mantine-color-dimmed"] ?? "";

    expect(contrast(dimmed, DARK_SURFACES.body)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dimmed, DARK_SURFACES.card)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves links to the scheme's link colour, readable in dark mode", () => {
    const merged = mergeMantineTheme(DEFAULT_THEME, theme);
    const resolved = cssVariablesResolver(merged);

    expect(theme.components?.["Anchor"]).toBeUndefined();
    expect(resolved.light["--mantine-color-anchor"]).toBe("var(--link-color)");
    expect(resolved.dark["--mantine-color-anchor"]).toBe("var(--link-color)");
    expect(
      contrast(resolved.dark["--link-color"] ?? "", DARK_SURFACES.body),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps complete badge labels and allows wrapping within a narrow container", () => {
    render(
      <MantineProvider theme={theme}>
        <Badge>Awaiting sign-off</Badge>
      </MantineProvider>,
    );

    const label = screen.getByText("Awaiting sign-off");
    expect(label.style.whiteSpace).toBe("normal");
    expect(label.style.overflowWrap).toBe("anywhere");
    expect(label.style.textOverflow).toBe("clip");
    const badge = label.closest<HTMLElement>(".mantine-Badge-root");
    expect(badge?.style.maxWidth).toBe("100%");
    expect(badge?.style.height).toBe("auto");
    expect(badge?.style.minWidth).not.toBe("max-content");
  });

  it("names the modal close button", () => {
    render(
      <MantineProvider theme={theme}>
        <Modal opened onClose={() => undefined} title="Example">
          Body
        </Modal>
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
  });
});

describe("corners", () => {
  it.each([
    "Button",
    "TextInput",
    "Select",
    "MultiSelect",
    "Textarea",
    "PasswordInput",
    "Card",
  ])(
    "leaves %s on Mantine's default radius, so buttons, fields and cards are rounded alike",
    (component) => {
      const defaults: Record<string, unknown> =
        theme.components?.[component]?.defaultProps ?? {};

      expect(defaults["radius"]).toBeUndefined();
    },
  );

  it("keeps Mantine's own default radius, which is rounded", () => {
    const radius = mergeMantineTheme(DEFAULT_THEME, theme).defaultRadius;

    expect(radius).toBe(DEFAULT_THEME.defaultRadius);
    expect(radius).not.toBe(0);
  });
});

describe("readable text on every page", () => {
  const merged = mergeMantineTheme(DEFAULT_THEME, theme);
  const resolved = cssVariablesResolver(merged);
  const defaults = defaultCssVariablesResolver(merged);

  describe.each([
    ["guidance and form descriptions", "--mantine-color-dimmed"],
    ["validation errors", "--mantine-color-error"],
  ] as const)("%s", (_description, variable) => {
    it.each([
      ["light", "body", "#ffffff"],
      ["light", "surface", merged.colors.gray[0]],
      ["dark", "body", DARK_SURFACES.body],
      ["dark", "card", DARK_SURFACES.card],
      ["dark", "input", DARK_SURFACES.input],
    ] as const)("keep normal-text contrast on the %s %s", (scheme, _surface, background) => {
      const variables: Record<string, string> = {
        ...defaults.variables,
        ...defaults[scheme],
        ...resolved[scheme],
      };
      const colour = variables[variable] ?? "";
      const foreground = colour.startsWith("var(")
        ? (variables[colour.slice(4, -1)] ?? "")
        : colour;

      expect(foreground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(foreground, background ?? "")).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe("links", () => {
  const merged = mergeMantineTheme(DEFAULT_THEME, theme);
  const resolved = cssVariablesResolver(merged);

  it("follow the scheme's link colour, primary shade 7 in light mode", () => {
    expect(resolved.light).toMatchObject(linkColourVariables.light);
    expect(resolved.dark).toMatchObject(linkColourVariables.dark);
    expect(resolved.light["--link-color"]).toBe(primaryScale[7]);
  });

  it.each([
    ["body", "#ffffff"],
    ["surface", mergeMantineTheme(DEFAULT_THEME, theme).colors.gray[0]],
  ] as const)("are at least 4.5:1 on the light %s", (_surface, background) => {
    expect(
      contrast(resolved.light["--link-color"] ?? "", background ?? ""),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("darken on hover to primary shade 8, short of the body text's own colour", () => {
    expect(resolved.light["--link-hover-color"]).toBe(primaryScale[8]);
    expect(resolved.light["--link-hover-color"]).not.toBe(primaryScale[9]);
    expect(resolved.light["--link-color"]).not.toBe(primaryScale[9]);
  });

  it("render without an inline colour, so the variable decides", () => {
    render(
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
        <Anchor href="/safety-files">Safety files</Anchor>
      </MantineProvider>,
    );

    expect(screen.getByRole("link", { name: "Safety files" }).style.color).toBe("");
  });
});

describe("the app's entry point", () => {
  const entry = fs.readFileSync(path.join(import.meta.dirname, "main.tsx"), "utf8");
  const preview = fs.readFileSync(
    path.join(import.meta.dirname, "..", ".storybook", "preview.tsx"),
    "utf8",
  );

  /** The bare `import "...";` lines of a file, with `../src/` read as `./`. */
  function sideEffectImports(source: string): string[] {
    return [...source.matchAll(/^import "([^"]+)";$/gm)].map((match) =>
      (match[1] ?? "").replace(/^\.\.\/src\//, "./"),
    );
  }

  it("gives the app the shared theme and its resolver", () => {
    expect(entry).toContain("theme={theme}");
    expect(entry).toContain("cssVariablesResolver={cssVariablesResolver}");
    expect(entry).toMatch(/from "\.\/theme"/);
    expect(entry).not.toMatch(/legacyTheme/);
  });

  it("loads the same fonts and stylesheets as Storybook, so pages match the catalogue", () => {
    expect(sideEffectImports(entry)).toEqual(sideEffectImports(preview));
  });
});

describe("dark-mode surfaces", () => {
  const resolved = cssVariablesResolver(mergeMantineTheme(DEFAULT_THEME, theme));

  it("puts the page, cards and inputs on the deep purples", () => {
    expect(resolved.dark["--mantine-color-body"]).toBe(DARK_SURFACES.body);
    expect(resolved.dark["--card-bg"]).toBe(DARK_SURFACES.card);
    expect(resolved.dark["--mantine-color-default"]).toBe(DARK_SURFACES.input);
    expect(resolved.dark["--mantine-color-dark-4"]).toBe(DARK_SURFACES.inputBorder);
  });

  it("gives the ribbon the brand purple in light mode and the page's colour in dark", () => {
    expect(resolved.light["--ribbon-bg"]).toBe(primaryScale[6]);
    expect(resolved.dark["--ribbon-bg"]).toBe(DARK_SURFACES.body);
  });

  it.each(Object.entries(statusTextColourValues.dark))(
    "keeps the %s status word at least 4.5:1 on the dark body, cards and inputs",
    (_name, colour) => {
      for (const surface of [DARK_SURFACES.body, DARK_SURFACES.card, DARK_SURFACES.input]) {
        expect(contrast(colour, surface)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("keeps links at least 4.5:1 on dark cards and inputs too", () => {
    const link = resolved.dark["--link-color"] ?? "";

    expect(contrast(link, DARK_SURFACES.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(link, DARK_SURFACES.input)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("light-mode text", () => {
  const merged = mergeMantineTheme(DEFAULT_THEME, theme);
  const resolved = cssVariablesResolver(merged);

  it("is primary shade 9, as Mantine's own black", () => {
    const defaults = defaultCssVariablesResolver(merged);

    expect(merged.black).toBe(primaryScale[9]);
    expect(defaults.light["--mantine-color-text"]).toBe(primaryScale[9]);
    expect(defaults.variables["--mantine-color-black"]).toBe(primaryScale[9]);
  });

  it("colours a default button's label too, not only body text", () => {
    const defaults = defaultCssVariablesResolver(merged);

    expect(defaults.light["--mantine-color-default-color"]).toBe("var(--mantine-color-black)");
  });

  it.each([
    ["body", "#ffffff"],
    ["surface", merged.colors.gray[0]],
  ] as const)("is at least 7:1 on the light %s, AAA for body text", (_surface, background) => {
    expect(contrast(primaryScale[9], background ?? "")).toBeGreaterThanOrEqual(7);
  });

  it("leaves dark mode to Mantine's own text colour", () => {
    expect(resolved.dark["--mantine-color-text"]).toBeUndefined();
  });
});
