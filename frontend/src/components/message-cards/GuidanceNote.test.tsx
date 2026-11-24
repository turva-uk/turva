import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { IconAlertTriangle } from "@/components/icons/appIcons";
import { renderWithMantine } from "@/test/test-utils";
import { statusColours } from "@/styles/semanticColours";
import GuidanceNote from "./GuidanceNote";

const css = fs.readFileSync(path.join(import.meta.dirname, "GuidanceNote.module.css"), "utf-8");

function renderNote(colour?: "warning" | "info") {
  return renderWithMantine(
    <GuidanceNote
      icon={<IconAlertTriangle />}
      colour={colour}
      title="Appointment is not professional verification"
      description="Check competence through your organisation's own governance."
    />,
  );
}

function styleOf(testId: string): string {
  return screen.getByTestId(testId).getAttribute("style") ?? "";
}

describe("GuidanceNote", () => {
  it("shows its title and description", () => {
    renderNote("warning");

    expect(
      screen.getByText("Appointment is not professional verification"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check competence through your organisation's own governance."),
    ).toBeInTheDocument();
  });

  it("is a plain card, not filled with colour as a StateMessage is", () => {
    renderNote("warning");

    const style = styleOf("guidance-note");

    // The card's ordinary surface, never the status colour's fill.
    expect(style).toContain("background-color: var(--card-bg, var(--mantine-color-body))");
    expect(style).not.toContain(`background-color: ${statusColours.warning.bg}`);
  });

  it("draws a stripe down its left edge, and its icon, in the status colour", () => {
    renderNote("warning");

    expect(screen.getByTestId("guidance-note").getAttribute("class")).toMatch(/note/);
    expect(styleOf("guidance-note")).toContain(
      `--guidance-note-stripe: ${statusColours.warning.bg}`,
    );
    expect(css).toMatch(/\.note::before\s*{[^}]*inset-inline-start:\s*0;/);
    expect(css).toMatch(
      /\.note::before\s*{[^}]*background-color:\s*var\(--guidance-note-stripe\);/,
    );
    expect(styleOf("guidance-note-icon")).toContain(`color: ${statusColours.warning.bg}`);
  });

  it("uses the info colour when none is given", () => {
    renderNote();

    expect(styleOf("guidance-note")).toContain(
      `--guidance-note-stripe: ${statusColours.info.bg}`,
    );
  });
});
