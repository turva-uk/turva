import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import { renderWithMantine } from "@/test/test-utils";

import WelcomeLayout from "./WelcomeLayout";
import { WELCOME_HEADING, WELCOME_LINES } from "./welcomeText";

describe("WelcomeLayout", () => {
  it("shows the page it is given", () => {
    renderWithMantine(
      <WelcomeLayout>
        <button type="submit">Sign in</button>
      </WelcomeLayout>,
    );

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("puts the logo, the heading and the lines in the welcome panel", () => {
    renderWithMantine(
      <WelcomeLayout>
        <p>Form</p>
      </WelcomeLayout>,
    );

    const panel = screen.getByTestId("welcome-panel");
    expect(within(panel).getByRole("img", { name: "Turva" })).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: WELCOME_HEADING })).toBeInTheDocument();
    for (const line of WELCOME_LINES) {
      expect(within(panel).getByText(line)).toBeInTheDocument();
    }
  });

  it("hides the panel below the md breakpoint, and never the page", () => {
    renderWithMantine(
      <WelcomeLayout>
        <p>Intended use</p>
      </WelcomeLayout>,
    );

    expect(screen.getByTestId("welcome-panel")).toHaveClass("mantine-visible-from-md");
    expect(screen.getByText("Intended use").closest(".mantine-visible-from-md")).toBeNull();
  });

  it("puts the page before the panel, so it is reached first", () => {
    renderWithMantine(
      <WelcomeLayout>
        <p>Form</p>
      </WelcomeLayout>,
    );

    const form = screen.getByText("Form");
    const panel = screen.getByTestId("welcome-panel");
    expect(form.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("gives the panel no background of its own, so its text keeps the page's colours", () => {
    renderWithMantine(
      <WelcomeLayout>
        <button type="submit">Sign in</button>
      </WelcomeLayout>,
    );

    const panel = screen.getByTestId("welcome-panel");
    const texts = [
      within(panel).getByRole("heading", { name: WELCOME_HEADING }),
      ...WELCOME_LINES.map((line) => within(panel).getByText(line)),
    ];

    for (const element of [panel, ...panel.querySelectorAll("*")]) {
      expect(element.getAttribute("style") ?? "").not.toMatch(/background/);
    }
    for (const text of texts) {
      expect(text.getAttribute("style") ?? "").not.toMatch(/white/);
    }
  });

  describe("the spacing", () => {
    const css = fs.readFileSync(
      path.join(import.meta.dirname, "WelcomeLayout.module.css"),
      "utf-8",
    );

    it("keeps the panel still where it starts, as a long form scrolls past", () => {
      renderWithMantine(
        <WelcomeLayout>
          <button type="submit">Sign in</button>
        </WelcomeLayout>,
      );

      expect(screen.getByTestId("welcome-panel").getAttribute("class")).toMatch(/column/);
      expect(css).toMatch(/\.column\s*{[^}]*position:\s*sticky;/);
      // It sticks where it already sits: below the shell's header and
      // padding, and the layout's own md top margin.
      expect(css).toMatch(
        /--welcome-panel-top:\s*calc\(\s*var\(--app-shell-header-offset, 0rem\) \+ var\(--app-shell-padding, 0rem\) \+\s*var\(--mantine-spacing-md\)\s*\);/,
      );
      expect(css).toMatch(/top:\s*var\(--welcome-panel-top\);/);
      // And it fits above the shell's bottom padding, so the foot of the
      // page never pushes it up.
      expect(css).toMatch(
        /height:\s*calc\(100dvh - var\(--welcome-panel-top\) - var\(--app-shell-padding, 0rem\)\);/,
      );
    });

    it("centres the panel's text vertically", () => {
      renderWithMantine(
        <WelcomeLayout>
          <button type="submit">Sign in</button>
        </WelcomeLayout>,
      );

      const text = within(screen.getByTestId("welcome-panel")).getByRole("heading", {
        name: WELCOME_HEADING,
      });

      expect(text.closest("[class*='panel']")).not.toBeNull();
      expect(css).toMatch(/\.panel\s*{[^}]*height:\s*100%;[^}]*justify-content:\s*center;/);
    });

    it("gives the form the panel's xl padding on its right, once the panel shows", () => {
      renderWithMantine(
        <WelcomeLayout>
          <button type="submit">Sign in</button>
        </WelcomeLayout>,
      );

      expect(screen.getByTestId("welcome-form").getAttribute("class")).toMatch(/form/);
      expect(css).toMatch(
        /@media \(min-width: \$mantine-breakpoint-md\)\s*{\s*\.form\s*{\s*padding-right:\s*var\(--mantine-spacing-xl\);/,
      );
    });
  });
});
