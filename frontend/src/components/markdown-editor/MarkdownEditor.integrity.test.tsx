import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorView } from "@tiptap/pm/view";
import { Editor } from "@tiptap/core";
import { renderWithMantine } from "@/test/test-utils";
import MarkdownEditor from "./MarkdownEditor";
import { editorKeepsEverything, markdownEditorExtensions } from "./extensions";

function serialised(source: string): string {
  const editor = new Editor({
    extensions: markdownEditorExtensions(),
    content: source,
    contentType: "markdown",
  });
  try {
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
}

describe("evidence editor integrity (TH-001)", () => {
  it("keeps the standalone sign-off note and its blank-headed table in rich editing", () => {
    const source =
      "## 6. Conclusion and sign-off\n\n<!-- This section is completed by the Clinical Safety Officer at approval. -->\n\n|                           |                |\n| ------------------------- | -------------- |\n| Clinical Safety Officer   | Dr Anita Patel |\n| Professional registration | GMC 7654321    |\n";
    expect(editorKeepsEverything(source)).toBe(true);
  });
  it("revokes editing when the read-only state changes", async () => {
    const onChange = vi.fn();
    const { rerender } = renderWithMantine(
      <MarkdownEditor label="Evidence" value="Retained narrative" onChange={onChange} />,
    );
    expect(await screen.findByRole("textbox", { name: "Evidence" })).toHaveAttribute(
      "contenteditable",
      "true",
    );
    rerender(
      <MarkdownEditor
        label="Evidence"
        value="Retained narrative"
        onChange={onChange}
        readOnly
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Evidence" })).toHaveAttribute(
        "contenteditable",
        "false",
      ),
    );
    expect(screen.getByRole("textbox", { name: "Evidence" })).toHaveAttribute(
      "aria-readonly",
      "true",
    );
    expect(screen.queryByLabelText("Bold")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("detects the loss of punctuation-only notes, not just missing words", () => {
    expect(editorKeepsEverything("Dose <!-- >= --> 5 mg.")).toBe(false);
  });

  it.each([
    "[diagram](diagram)",
    "[#evidence](#evidence)",
    "[/safety](/safety)",
    "[not-an-email](mailto:not-an-email)",
  ])("does not turn an explicit reference into ordinary text: %s", (reference) => {
    expect(serialised(reference)).toBe(reference);
  });

  it.each([
    "`[https://example.test](https://example.test)`",
    "```\n[https://example.test](https://example.test)\n```",
  ])("does not rewrite link-like examples inside code: %s", (source) => {
    expect(serialised(source)).toBe(source);
  });

  it.each([
    '<img src="https://blocked.example.test/scan.png">',
    "[![Diagram](https://blocked.example.test/scan.png)](https://example.test)",
    '<div data-html-comment data-body="forged">Retained?</div>',
  ])("refuses HTML/resources before creating browser elements: %s", (value) => {
    const create = vi.spyOn(document, "createElement");
    try {
      expect(editorKeepsEverything(value)).toBe(false);
      expect(create).not.toHaveBeenCalled();
    } finally {
      create.mockRestore();
    }
  });

  it.each([
    "Review if dose >= 5 mg and < 10 mg.",
    "Do **not** deploy before review.",
    "Read [supplier evidence](https://example.test/evidence?id=4&version=2).",
    "## Notes\n\n<!-- >= 5 is a review threshold, not a decision. -->\n\nDraft only.",
  ])("keeps supported punctuation, emphasis and references: %s", (value) => {
    expect(editorKeepsEverything(value)).toBe(true);
  });

  it("passes only plain clipboard text to ProseMirror, before HTML parsing", async () => {
    const onChange = vi.fn();
    renderWithMantine(<MarkdownEditor label="Evidence" value="Draft. " onChange={onChange} />);
    const input = await screen.findByRole("textbox", { name: "Evidence" });
    // jsdom has no selection geometry. The browser story exercises the real
    // paste; this checks the event boundary without inventing layout stubs.
    const paste = vi.spyOn(EditorView.prototype, "pasteText").mockReturnValue(true);
    try {
      fireEvent.paste(input, {
        clipboardData: {
          getData: (type: string) =>
            type === "text/plain"
              ? "Review >= 5 mg. <img src=unapproved>"
              : type === "text/html"
                ? '<img src="https://blocked.example.test/scan.png"><b>Review</b>'
                : "",
        },
      });
      expect(paste).toHaveBeenCalledExactlyOnceWith("Review >= 5 mg. <img src=unapproved>");
      expect(input.querySelector("img,iframe,b")).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent("Pasted as plain text");
    } finally {
      paste.mockRestore();
    }
  });

  it("does not insert an image-only clipboard or external drop", async () => {
    const onChange = vi.fn();
    renderWithMantine(
      <MarkdownEditor label="Evidence" value="Retained narrative" onChange={onChange} />,
    );
    const input = await screen.findByRole("textbox", { name: "Evidence" });
    fireEvent.paste(input, { clipboardData: { getData: () => "" } });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was inserted");
    fireEvent.drop(input, {
      dataTransfer: { getData: () => '<img src="https://blocked.example.test/drop.png">' },
    });
    expect(input).toHaveTextContent("Retained narrative");
    expect(input.querySelector("img,iframe")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "instead of dropping external content",
    );
  });

  it("retains the mounted draft until another document/version is intentionally opened", async () => {
    const onChange = vi.fn();
    const { rerender } = renderWithMantine(
      <MarkdownEditor
        key="opened-head"
        label="Evidence"
        value="Opened narrative"
        onChange={onChange}
      />,
    );
    await screen.findByRole("textbox", { name: "Evidence" });
    rerender(
      <MarkdownEditor
        key="opened-head"
        label="Evidence"
        value="Incoming version"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Evidence" })).toHaveTextContent(
      "Opened narrative",
    );
    expect(screen.getByRole("textbox", { name: "Evidence" })).not.toHaveTextContent(
      "Incoming version",
    );
    rerender(
      <MarkdownEditor
        key="intentionally-opened-head"
        label="Evidence"
        value="Incoming version"
        onChange={onChange}
      />,
    );
    expect(await screen.findByRole("textbox", { name: "Evidence" })).toHaveTextContent(
      "Incoming version",
    );
  });

  it("retains source when a read-only fallback is shown", async () => {
    const onChange = vi.fn();
    const value = "Before <!-- inline --> after.";
    renderWithMantine(
      <MarkdownEditor label="Evidence" value={value} onChange={onChange} readOnly />,
    );
    const input = await screen.findByRole("textbox", { name: "Evidence" });
    expect(input).toHaveValue(value);
    expect(input).toHaveAttribute("readonly");
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    "Before <!-- an inline review note --> after.",
    "![Reviewed diagram](evidence/diagram.png)",
    '<iframe src="https://blocked.example.test/evidence"></iframe>',
  ])(
    "preserves unsupported input as editable source instead of discarding it: %s",
    async (value) => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithMantine(<MarkdownEditor label="Evidence" value={value} onChange={onChange} />);
      const input = await screen.findByRole("textbox", { name: "Evidence" });
      expect(input).toHaveValue(value);
      expect(screen.getByRole("alert")).toHaveTextContent(/source/i);
      expect(document.querySelector('[contenteditable="true"], iframe, img')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      await user.click(input);
      await user.keyboard("{End} reviewed");
      expect(onChange).toHaveBeenCalled();
    },
  );
});
