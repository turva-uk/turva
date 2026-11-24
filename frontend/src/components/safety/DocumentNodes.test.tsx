/**
 * DocumentNodes Component Tests
 *
 * The page's tests drive this through the document route. These check the
 * renderer on its own: what it refuses to create, and what it marks.
 */

import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import type { DocumentNode, SafetyDocumentContent } from "@/lib/safety";
import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_DOCUMENT } from "@/test/safetyFile";

import DocumentNodes from "./DocumentNodes";
import classes from "./DocumentNodes.module.css";

function show(document: Partial<SafetyDocumentContent> = {}) {
  return renderWithRouter(
    <DocumentNodes document={{ ...SAMPLE_DOCUMENT, ...document }} slug="demo" />,
  );
}

const text = (value: string): DocumentNode => ({ type: "text", text: value });

describe("DocumentNodes", () => {
  it("draws the document's headings beneath the page's own h1", () => {
    show();

    const heading = screen.getByRole("heading", { name: "1. System" });
    expect(heading.tagName).toBe("H3");
    expect(heading).toHaveAttribute("id", "doc-system");
  });

  it("shows text that looks like HTML as text, creating nothing from it", () => {
    const { container } = show();

    expect(
      screen.getByText(/<img src=x onerror="alert\(1\)"> stays text\./),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("refuses a tag outside the allowlist, saying so where it was", () => {
    const { container } = show({
      blocks: [
        { type: "element", tag: "script", children: [text("alert(1)")] },
        { type: "element", tag: "iframe", children: [] },
        { type: "element", tag: "style", children: [text("body { display: none }")] },
      ],
    });

    // Scoped to the document: Mantine's provider puts its own style tag
    // in the container.
    const rendered = container.querySelector(
      `.${classes.document ?? "missing-css-module-class"}`,
    );
    expect(rendered).not.toBeNull();
    expect(rendered?.querySelector("script, iframe, style")).toBeNull();
    expect(screen.getAllByRole("note")).toHaveLength(3);
    expect(screen.queryByText("alert(1)")).not.toBeInTheDocument();
  });

  it("follows only web and mail links, and marks them as external", () => {
    show({
      blocks: [
        { type: "external", href: "https://example.org/", children: [text("Safe")] },
        { type: "external", href: "javascript:alert(1)", children: [text("Unsafe")] },
      ],
    });

    const safe = screen.getByRole("link", { name: /Safe/ });
    expect(safe).toHaveAttribute("href", "https://example.org/");
    expect(safe).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(safe).toHaveTextContent("(external link)");
    expect(screen.queryByRole("link", { name: /Unsafe/ })).not.toBeInTheDocument();
    expect(screen.getByText("Unsafe")).toBeInTheDocument();
  });

  it("links another document by its route, and refuses a key that is not one", () => {
    show({
      blocks: [
        {
          type: "document",
          document: "hazard-log",
          fragment: "open hazards",
          children: [text("Hazard log")],
        },
        { type: "document", document: "../members", children: [text("Members")] },
      ],
    });

    expect(screen.getByRole("link", { name: "Hazard log" })).toHaveAttribute(
      "href",
      "/safety-files/demo/documents/hazard-log/#doc-open%20hazards",
    );
    expect(screen.queryByRole("link", { name: "Members" })).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Members [Not followed: invalid document identifier.]",
    );
  });

  it("puts a table in a region the keyboard can scroll, keeping its alignment", () => {
    show({
      blocks: [
        {
          type: "element",
          tag: "table",
          children: [
            {
              type: "element",
              tag: "tr",
              children: [
                {
                  type: "element",
                  tag: "td",
                  attrs: { align: "center" },
                  children: [text("4")],
                },
              ],
            },
          ],
        },
      ],
    });

    const region = screen.getByRole("region", { name: "Table, scrolls horizontally" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).getByRole("cell", { name: "4" })).toHaveClass(
      classes.alignCenter ?? "missing-css-module-class",
    );
  });

  it("marks what it leaves out, and says how many items are not shown", () => {
    show();

    expect(screen.getByRole("note")).toHaveTextContent(
      "[Not shown: an image (Pathway diagram).]",
    );
    expect(screen.getByText("Some content is not shown")).toBeInTheDocument();
    expect(screen.getByText(/contains 1 item Turva does not display/)).toBeInTheDocument();
  });

  it("gives nothing inside the document a style attribute", () => {
    const { container } = show();

    const rendered = container.querySelector(
      `.${classes.document ?? "missing-css-module-class"}`,
    );
    expect(rendered).not.toBeNull();
    expect(rendered?.querySelector("[style]")).toBeNull();
  });

  it("names an admonition by its title", () => {
    show();

    expect(screen.getByRole("complementary", { name: "Residual risk" })).toHaveTextContent(
      "Two hazards remain",
    );
  });

  it("shows the committed source as text when the formatted view is refused", () => {
    const source = "# Report\n\n<script>alert(1)</script>";
    const { container } = show({
      available: false,
      reason: "unsupported-formatting",
      message: "This document uses formatting Turva cannot show safely.",
      source,
      blocks: [],
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Formatted view unavailable");
    const region = screen.getByRole("region", { name: "Committed Markdown source" });
    expect(region.textContent).toBe(source);
    expect(container.querySelector("script")).toBeNull();
  });

  it("does not show source for any other refusal", () => {
    show({
      available: false,
      reason: "too-large",
      message: "This document is too large to show.",
      source: "# Not for display",
      blocks: [],
    });

    expect(screen.getByRole("alert")).toHaveTextContent("This document cannot be shown");
    expect(screen.queryByText("# Not for display")).not.toBeInTheDocument();
  });

  it("says when the committed version has no content", () => {
    show({ blocks: [], unsupported: 0 });

    expect(
      screen.getByText("This document has no content in the committed version."),
    ).toBeInTheDocument();
  });
});
