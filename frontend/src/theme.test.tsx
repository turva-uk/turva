import {
  Alert,
  Badge,
  DEFAULT_THEME,
  MantineProvider,
  Modal,
  mergeMantineTheme,
} from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import breakpoints from "./breakpoints.json";
import {
  BODY_FONT,
  BRAND,
  cssVariablesResolver,
  statusColourValues,
  statusTextColourValues,
  theme,
  TURVA_PURPLE,
  TURVA_YELLOW,
  typographyTokens,
} from "./theme";

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
  /** WCAG 2.2 relative luminance of a `#rrggbb` colour. */
  function luminance(colour: string): number {
    const channels = [1, 3, 5].map(
      (start) => parseInt(colour.slice(start, start + 2), 16) / 255,
    );
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

  it("names Turva's own scales as primary and secondary, unchanged", () => {
    expect(theme.colors?.["primary"]).toEqual([...TURVA_PURPLE]);
    expect(theme.colors?.["secondary"]).toEqual([...TURVA_YELLOW]);
    expect(theme.primaryColor).toBe("turva");
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

  it("takes its breakpoints from breakpoints.json", () => {
    expect(theme.breakpoints).toEqual(breakpoints);
  });

  it("exposes the status and brand colours as CSS variables", () => {
    const resolved = cssVariablesResolver(mergeMantineTheme(DEFAULT_THEME, theme));

    expect(resolved.variables["--success-color"]).toBe(statusColourValues.success);
    expect(resolved.variables["--brand-primary"]).toBe(BRAND);
    expect(resolved.light["--success-text-color"]).toBe(statusTextColourValues.light.success);
    expect(resolved.dark["--success-text-color"]).toBe(statusTextColourValues.dark.success);
  });

  it("never cuts a badge short", () => {
    render(
      <MantineProvider theme={theme}>
        <Badge>Awaiting sign-off</Badge>
      </MantineProvider>,
    );

    const label = screen.getByText("Awaiting sign-off");
    expect(label.style.whiteSpace).toBe("nowrap");
    expect(label.style.textOverflow).toBe("clip");
    expect(label.closest<HTMLElement>(".mantine-Badge-root")?.style.flexShrink).toBe("0");
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
