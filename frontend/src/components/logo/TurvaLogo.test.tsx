import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithMantine } from "@/test/test-utils";
import TurvaLogo from "./TurvaLogo";

describe("TurvaLogo", () => {
  it("is an image called Turva by default", () => {
    renderWithMantine(<TurvaLogo />);

    expect(screen.getByRole("img", { name: "Turva" })).toBeInTheDocument();
  });

  it("takes another accessible name", () => {
    renderWithMantine(<TurvaLogo label="Turva home" />);

    expect(screen.getByRole("img", { name: "Turva home" })).toBeInTheDocument();
  });

  it("is hidden from assistive technology when decorative", () => {
    renderWithMantine(<TurvaLogo decorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("turva-logo")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws at the size it is given", () => {
    renderWithMantine(<TurvaLogo size={48} />);

    const logo = screen.getByTestId("turva-logo");
    expect(logo).toHaveAttribute("width", "48");
    expect(logo).toHaveAttribute("height", "48");
  });

  it("takes its colours from the theme's primary and secondary scales", () => {
    renderWithMantine(<TurvaLogo />);

    const logo = screen.getByTestId("turva-logo");
    expect(logo.querySelector("rect")).toHaveAttribute(
      "fill",
      "var(--mantine-color-secondary-6)",
    );
    for (const path of logo.querySelectorAll("path")) {
      expect(path).toHaveAttribute("stroke", "var(--mantine-color-primary-6)");
    }
  });

  it("rounds its corners with the theme's md radius, as the cards are", () => {
    renderWithMantine(<TurvaLogo />);

    const css = fs.readFileSync(
      path.join(import.meta.dirname, "TurvaLogo.module.css"),
      "utf-8",
    );
    const logo = screen.getByTestId("turva-logo");

    expect(logo.getAttribute("class")).toMatch(/logo/);
    expect(css).toMatch(/border-radius:\s*var\(--mantine-radius-md\)/);
    expect(css).toMatch(/overflow:\s*hidden/);
  });
});
