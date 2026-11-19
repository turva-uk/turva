/**
 * MarkdownEditor Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { LAYOUT_STICKY_TOP } from "@/components/layouts/layoutConstants";
import MarkdownEditor from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("shows its label and renders the Markdown it is given", async () => {
    renderWithMantine(
      <MarkdownEditor
        label="Residual risk statement"
        value={"## Residual risk\n\nTwo hazards remain at **level 3**."}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Residual risk statement")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Residual risk" })).toBeInTheDocument();
    expect(screen.getByText("level 3").tagName).toBe("STRONG");
  });

  it("names the editable area for a screen reader", async () => {
    renderWithMantine(<MarkdownEditor label="Notes" value="Some text" onChange={vi.fn()} />);

    expect(await screen.findByRole("textbox", { name: "Notes" })).toBeInTheDocument();
  });

  it("offers formatting, unless it is read-only", async () => {
    const { unmount } = renderWithMantine(
      <MarkdownEditor label="Notes" value="x" onChange={vi.fn()} />,
    );
    expect(await screen.findByLabelText("Bold")).toBeInTheDocument();
    unmount();

    renderWithMantine(<MarkdownEditor label="Notes" value="x" onChange={vi.fn()} readOnly />);
    expect(screen.queryByLabelText("Bold")).not.toBeInTheDocument();
  });

  it("keeps its toolbar in view while a long document is scrolled", async () => {
    renderWithMantine(<MarkdownEditor label="Notes" value="x" onChange={vi.fn()} />);

    const toolbar = (await screen.findByLabelText("Bold")).closest(
      ".mantine-RichTextEditor-toolbar",
    );

    expect(toolbar).toHaveAttribute("data-sticky");
    // Up through the page's top padding, so no text shows above it.
    expect(toolbar?.getAttribute("style")).toContain(LAYOUT_STICKY_TOP);
  });

  describe("table controls", () => {
    const ROWS_AND_COLUMNS = [
      "Add a row above",
      "Add a row below",
      "Delete the row",
      "Add a column to the left",
      "Add a column to the right",
      "Delete the column",
    ];

    it("offers to insert a table while the cursor is not in one", async () => {
      renderWithMantine(<MarkdownEditor label="Notes" value="Some text" onChange={vi.fn()} />);

      expect(await screen.findByRole("button", { name: "Insert a table" })).toBeInTheDocument();
      for (const name of ROWS_AND_COLUMNS) {
        expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
      }
    });

    it("inserts a table, and offers its rows and columns with the cursor in it", async () => {
      const onChange = vi.fn();
      renderWithMantine(<MarkdownEditor label="Notes" value="Some text" onChange={onChange} />);

      await userEvent.click(await screen.findByRole("button", { name: "Insert a table" }));

      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^\|.*\|\n\|\s*-+/m)),
      );
      for (const name of ROWS_AND_COLUMNS) {
        expect(await screen.findByRole("button", { name })).toBeInTheDocument();
      }
    });

    it("adds a row below, and writes it in the Markdown", async () => {
      const onChange = vi.fn();
      renderWithMantine(<MarkdownEditor label="Notes" value="Some text" onChange={onChange} />);
      await userEvent.click(await screen.findByRole("button", { name: "Insert a table" }));
      const before = String(onChange.mock.lastCall?.[0] ?? "");

      await userEvent.click(await screen.findByRole("button", { name: "Add a row below" }));

      const after = String(onChange.mock.lastCall?.[0] ?? "");
      const lines = (text: string) =>
        text.split("\n").filter((line) => line.trim().startsWith("|"));
      expect(lines(after)).toHaveLength(lines(before).length + 1);
    });

    it("offers no merging of cells, which Markdown cannot hold", async () => {
      renderWithMantine(<MarkdownEditor label="Notes" value="Some text" onChange={vi.fn()} />);
      await userEvent.click(await screen.findByRole("button", { name: "Insert a table" }));

      expect(screen.queryByRole("button", { name: /merge/i })).not.toBeInTheDocument();
    });

    it("offers no table controls when read-only", () => {
      renderWithMantine(<MarkdownEditor label="Notes" value="x" onChange={vi.fn()} readOnly />);

      expect(screen.queryByRole("button", { name: "Insert a table" })).not.toBeInTheDocument();
    });
  });
});
