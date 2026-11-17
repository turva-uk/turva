import fs from "node:fs";
import path from "node:path";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithMantine } from "@/test/test-utils";

import BrandSpinner, { BELT_SPINNER_SRC, BELT_SPINNER_STILL_SRC } from "./BrandSpinner";

describe("BrandSpinner", () => {
  it("tells screen readers it is loading", () => {
    renderWithMantine(<BrandSpinner />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("can say what is loading", () => {
    renderWithMantine(<BrandSpinner label="Loading hazards" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading hazards");
  });

  it("shows Turva's belt animation", () => {
    const { container } = renderWithMantine(<BrandSpinner />);

    expect(container.querySelector("img")?.getAttribute("src")).toBe(BELT_SPINNER_SRC);
    expect(BELT_SPINNER_SRC).toMatch(/belt-spinner\.webp$/);
  });

  it("shows the still frame to somebody who asked for less motion", () => {
    const { container } = renderWithMantine(<BrandSpinner />);
    const source = container.querySelector("picture source");

    expect(source?.getAttribute("media")).toBe("(prefers-reduced-motion: reduce)");
    expect(source?.getAttribute("srcset")).toBe(BELT_SPINNER_STILL_SRC);
  });

  it("hides the image from assistive technology", () => {
    const { container } = renderWithMantine(<BrandSpinner />);

    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("img")?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("is 4rem square unless told otherwise", () => {
    renderWithMantine(<BrandSpinner />);
    const spinner = screen.getByRole("status").parentElement;

    expect(spinner?.style.width).toContain("4rem");
    expect(spinner?.style.height).toContain("4rem");
  });

  it("takes a size", () => {
    renderWithMantine(<BrandSpinner size="2rem" />);
    const spinner = screen.getByRole("status").parentElement;

    expect(spinner?.style.width).toContain("2rem");
  });
});

const stylesheet = fs.readFileSync(
  path.join(import.meta.dirname, "BrandSpinner.module.css"),
  "utf8",
);

describe("BrandSpinner stylesheet", () => {
  it("keeps the still frame fading in and out for somebody who asked for less motion", () => {
    const reducedMotion = stylesheet.split("@media (prefers-reduced-motion: reduce)")[1] ?? "";

    expect(reducedMotion).toMatch(/\.still\s*\{[^}]*animation: pulse/);
  });
});
