import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { IconUserPlus } from "@/components/icons/appIcons";
import MarkdownView from "./MarkdownView";

// TH-001: a displayed document must not silently change an evidence reference
// or identifier. These vectors follow CommonMark, not the previous regexes.
describe("MarkdownView evidence fidelity (TH-001)", () => {
  it.each([
    "https://example.com/safety_case_report",
    "https://example.com/evidence_(approved)",
    "https://example.com/report?file=safety_case&revision=2",
    "/safety-files/example/hazards/HAZ-001",
    "../evidence/safety_case_report",
    "#mitigation-evidence",
    "mailto:cso@example.com",
    "tel:+441234567890",
  ])("preserves the reference URL %s", (href) => {
    const { container } = renderWithMantine(<MarkdownView source={`[Evidence](${href})`} />);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(href);
  });

  it.each(["severity_score_current", "**not bold**", "<script>literal</script>"])(
    "keeps inline code literal: %s",
    (source) => {
      const { container } = renderWithMantine(<MarkdownView source={`\`${source}\``} />);
      expect(container.querySelector("code")?.textContent).toBe(source);
      expect(container.querySelector("code em, code strong, code script")).toBeNull();
    },
  );

  it("preserves nested lists and the source's starting number after sanitisation", () => {
    const { container } = renderWithMantine(
      <MarkdownView
        source={"3. Verify the mitigation\n   - Check the evidence\n4. Record the result"}
      />,
    );
    expect(container.querySelector("ol")?.start).toBe(3);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("ol > li > ul > li")?.textContent).toBe(
      "Check the evidence",
    );
  });

  it("preserves reference-style evidence links", () => {
    renderWithMantine(
      <MarkdownView
        source={"See [the evidence][report].\n\n[report]: https://example.com/safety_case"}
      />,
    );
    expect(screen.getByRole("link", { name: "the evidence" })).toHaveAttribute(
      "href",
      "https://example.com/safety_case",
    );
  });

  it("does not remove comment-like text inside fenced or inline code", () => {
    const { container } = renderWithMantine(
      <MarkdownView
        source={
          "`<!-- inline -->`\n\n```\n<!-- fenced -->\n```\n\n<!-- omitted-review-note -->\n\nStill recorded."
        }
        hideComments
      />,
    );
    const code = [...container.querySelectorAll("code")].map((node) => node.textContent);
    expect(code).toEqual(["<!-- inline -->", "<!-- fenced -->\n"]);
    expect(screen.queryByText(/omitted-review-note/)).toBeNull();
    expect(container.textContent).toContain("Still recorded.");
  });

  it("keeps literal icon notation inside code and URLs", async () => {
    const { container } = renderWithMantine(
      <MarkdownView
        source={
          "`:icon-user-plus:`\n\n[Evidence](https://example.com/:icon-user-plus:)\n\nPress :icon-user-plus:."
        }
        icons={{ "user-plus": <IconUserPlus /> }}
      />,
    );
    expect(container.querySelector("code")?.textContent).toBe(":icon-user-plus:");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/:icon-user-plus:",
    );
    await waitFor(() =>
      expect(container.querySelectorAll("span[data-icon] svg")).toHaveLength(1),
    );
  });

  it("keeps a table's inline code and escaped pipes", () => {
    renderWithMantine(
      <MarkdownView
        source={"| Reference | Meaning |\n| --- | --- |\n| `safety_case` | this \\| that |"}
        tables
      />,
    );
    expect(screen.getByRole("cell", { name: "safety_case" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "this | that" })).toBeInTheDocument();
  });

  it("does not leak another view's enabled tables or icons", () => {
    const source = "| Reference |\n| --- |\n| :icon-user-plus: |";
    const { rerender, container } = renderWithMantine(
      <MarkdownView source={source} tables icons={{ "user-plus": <IconUserPlus /> }} />,
    );
    expect(container.querySelector("table")).not.toBeNull();
    rerender(<MarkdownView source={source} />);
    expect(container.querySelector("table, span[data-icon]")).toBeNull();
    expect(container.textContent).toContain(":icon-user-plus:");
  });

  it("draws approved icons when loading finishes without a source change", async () => {
    const icons = { "user-plus": <IconUserPlus /> };
    const { rerender, container } = renderWithMantine(
      <MarkdownView source="Press :icon-user-plus:." icons={icons} isLoading />,
    );
    rerender(<MarkdownView source="Press :icon-user-plus:." icons={icons} />);
    await waitFor(() => expect(container.querySelector("span[data-icon] svg")).not.toBeNull());
  });
});

describe("MarkdownView resource boundary (TH-005)", () => {
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,example",
    "vbscript:example",
    "file:///etc/passwd",
  ])("does not follow an unsafe reference: %s", async (href) => {
    const onLinkClick = vi.fn();
    renderWithMantine(
      <MarkdownView source={`[Evidence](${href})`} onLinkClick={onLinkClick} />,
    );
    const link = screen.getByRole("link", { name: "Evidence" });
    expect(link).toHaveAttribute("href", "#");
    await userEvent.setup().click(link);
    expect(onLinkClick).toHaveBeenCalledWith("#");
  });

  it("never activates raw HTML, even when tables, images and icons are enabled", () => {
    const { container } = renderWithMantine(
      <MarkdownView
        source={
          '<img src="https://example.com/track.png" onerror="alert(1)">\n\n<script>alert(1)</script>\n\n<iframe src="https://example.com"></iframe>'
        }
        imageBase="/guide-assets"
        tables
        icons={{ "user-plus": <IconUserPlus /> }}
      />,
    );
    expect(container.querySelector("img, script, iframe, [onerror]")).toBeNull();
    expect(container.textContent).toContain('<img src="https://example.com/track.png"');
  });

  it.each([
    "https://example.com/image.png",
    "//example.com/image.png",
    "../private/image.png",
    "a/%2e%2e/image.png",
  ])("keeps image addresses beneath the approved base: %s", (href) => {
    const { container } = renderWithMantine(
      <MarkdownView source={`![Evidence](${href})`} imageBase="/guide-assets" />,
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
