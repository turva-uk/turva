/**
 * A hazard's body, through the editor and back.
 *
 * A hazard's body is Markdown in the safety file's Git history. Once a
 * page saves through this editor, every change it makes to the text is a
 * commit to that history, so this pins exactly what comes back: what is
 * kept, and each thing the editor writes differently.
 *
 * As of Tiptap 3.33.0 nothing is lost, the HTML comment included, and
 * the editor rewrites three things, each named in `EXPECTED` below.
 */

import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { editorKeepsEverything, markdownEditorExtensions, tidyMarkdown } from "./extensions";

/** A body written the way Turva's hazard files are. */
const BODY = [
  "## Notes",
  "",
  "Identified during the pathway walkthrough with the ward team.",
  "",
  "<!-- The officer completes this section at approval. -->",
  "",
  "### Causes",
  "",
  "* The ward list sorts by bed, not by name.",
  "* Two patients share a surname.",
  "",
  "### Steps to reproduce",
  "",
  "1. Open the ward list.",
  "2. Select the second Smith.",
  "",
  "See the [supplier's release notes](https://example.org/notes) for the fix.",
  "",
  "| Field | Before | After |",
  "| ----- | ------ | ----- |",
  "| Sort  | Bed    | Name  |",
  "",
  "**Fictional test only.**",
  "",
].join("\n");

/**
 * What the editor writes back. Three rewrites, none of them a lost word:
 *
 * 1. **`*` lists become `-` lists.** The same list on the page.
 * 2. **The table gets a second blank line above and below.** The same
 *    table on the page.
 * 3. **The final newline goes.** Git notes it as "no newline at end of
 *    file"; the page is the same.
 */
const EXPECTED = [
  "## Notes",
  "",
  "Identified during the pathway walkthrough with the ward team.",
  "",
  "<!-- The officer completes this section at approval. -->",
  "",
  "### Causes",
  "",
  "- The ward list sorts by bed, not by name.",
  "- Two patients share a surname.",
  "",
  "### Steps to reproduce",
  "",
  "1. Open the ward list.",
  "2. Select the second Smith.",
  "",
  "See the [supplier's release notes](https://example.org/notes) for the fix.",
  "",
  "",
  "| Field | Before | After |",
  "| ----- | ------ | ----- |",
  "| Sort  | Bed    | Name  |",
  "",
  "",
  "**Fictional test only.**",
].join("\n");

let editors: Editor[] = [];

afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
});

/** What the editor saves for *source*: its Markdown, tidied as `onChange` tidies it. */
function saved(source: string): string {
  const editor = new Editor({
    extensions: markdownEditorExtensions(),
    content: source,
    contentType: "markdown",
  });
  editors.push(editor);

  return tidyMarkdown(editor.getMarkdown());
}

describe("a hazard body through the editor", () => {
  it("comes back exactly as EXPECTED, with only the rewrites it names", () => {
    expect(saved(BODY)).toBe(EXPECTED);
  });

  it("keeps the HTML comment, which the published page leaves out", () => {
    expect(saved(BODY)).toContain(
      "\n<!-- The officer completes this section at approval. -->\n",
    );
  });

  it("keeps every word, so the editor would open it", () => {
    expect(editorKeepsEverything(BODY)).toBe(true);
  });

  it("changes nothing the second time, so saving twice is one commit, not two", () => {
    expect(saved(EXPECTED)).toBe(EXPECTED);
  });
});
