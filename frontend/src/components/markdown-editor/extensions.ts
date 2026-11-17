/**
 * What `MarkdownEditor` can hold, and so what it can write back.
 *
 * Kept apart from the component so a test can build the same editor
 * without React and check that a document comes back as it went in.
 * Anything the editor cannot hold it drops on reading, and saving then
 * writes the document without it: that is how a safety file's tables
 * were lost before `TableKit` was added here.
 */

import { Link } from "@mantine/tiptap";
import { Editor, type Extensions } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { HtmlComment } from "./htmlComment";

/**
 * Prose, tables and the notes left as HTML comments. A table's columns
 * are not resizable: a width set by dragging could not be written to
 * Markdown, so it would be lost on the next save.
 */
export function markdownEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ link: false }),
    Link,
    TableKit.configure({ table: { resizable: false } }),
    HtmlComment,
    Markdown,
  ];
}

/** A link in Markdown: its words and where it goes. */
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/**
 * The editor's Markdown, with the address it turned into a link put back
 * as the address.
 *
 * The editor links a bare email or web address as it reads it, and then
 * writes it as `[a.patel@…](mailto:a.patel@…)`: the same on the page, but
 * a different file, with the address twice. A link whose words are its
 * own address, or the address of a `mailto:` one, is written as the
 * address alone. A link somebody gave words of their own is left be.
 */
export function tidyMarkdown(markdown: string): string {
  return markdown.replace(LINK, (whole, text: string, url: string) => {
    const shown = text.replace(/\\(.)/g, "$1");

    return url === shown || url === `mailto:${shown}` ? text : whole;
  });
}

/**
 * The characters the editor writes as entities, `&` as `&amp;`, which
 * Markdown reads as the characters they stand for.
 */
const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/** The text's words, in order, without the marks that format them. */
function words(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\\(.)/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Whether the editor keeps every word of this Markdown.
 *
 * The text is read into an editor nobody sees and written back, and the
 * words compared. Formatting may be written differently, a `*` list for
 * a `-` one, and that does not count; a word that goes missing does,
 * since saving would then lose it. This is the general form of the check
 * that once kept tables out of the editor: whatever the editor cannot
 * yet hold, a document carrying it is not opened there.
 */
export function editorKeepsEverything(markdown: string): boolean {
  const editor = new Editor({
    extensions: markdownEditorExtensions(),
    content: markdown,
    contentType: "markdown",
  });

  try {
    return words(tidyMarkdown(editor.getMarkdown())) === words(markdown);
  } finally {
    editor.destroy();
  }
}
