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
import { Marked } from "marked";
import { commentBody, HtmlComment } from "./htmlComment";

/**
 * Prose, tables and the notes left as HTML comments. A table's columns
 * are not resizable: a width set by dragging could not be written to
 * Markdown, so it would be lost on the next save.
 */
export function markdownEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ link: false }),
    Link.extend({
      renderMarkdown(node, helpers, context) {
        if (!this.parent) throw new Error("The link Markdown serializer is unavailable");
        const explicit = this.parent(node, helpers, context);
        const text = helpers.renderChildren(node);
        // Tiptap renders mark delimiters around a placeholder, exposing the
        // real span separately in the render context. Compare that span,
        // while returning the placeholder so delimiter extraction still works.
        const span = context.meta?.["markText"];
        const content = typeof span === "string" ? span : text;
        const reference = this.parent(
          node,
          { ...helpers, renderChildren: () => content },
          context,
        );
        // Shorten only real link nodes with the same parsed meaning. A
        // whole-document regex also rewrites link-like text inside code.
        return fidelityParser.parseInline(content) === fidelityParser.parseInline(reference)
          ? text
          : explicit;
      },
    }).configure({ openOnClick: false }),
    TableKit.configure({ table: { resizable: false } }),
    HtmlComment,
    Markdown,
  ];
}

// Comparison only: this HTML is never inserted into a document. Marked
// normalises list markers, table padding and final newlines without throwing
// away punctuation, comments, link targets or document structure.
const fidelityParser = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html({ text }) {
      // Marked 17 includes surrounding blank lines in raw comment tokens.
      // Ignore only that inter-block spacing, never whitespace inside a note.
      const body = commentBody(text);
      return body === null ? text : `<!--${body}-->\n`;
    },
  },
});

/**
 * Whether the editor preserves the parsed Markdown, including punctuation.
 *
 * The text is read into an editor nobody sees and written back, and the
 * parsed output compared. Harmless source formatting may differ; changes to
 * content or structure fail closed. Unsupported resources and raw HTML are
 * rejected before Tiptap can parse HTML into browser elements. Standalone
 * comments are safe because HtmlComment renders their body as text.
 */
export function editorKeepsEverything(markdown: string): boolean {
  let editor: Editor | null = null;
  try {
    let unsupported = false;
    void fidelityParser.walkTokens(fidelityParser.lexer(markdown), (token) => {
      if (
        token.type === "image" ||
        (token.type === "html" && (token.block === false || commentBody(token.raw) === null))
      ) {
        unsupported = true;
      }
    });
    if (unsupported) return false;
    editor = new Editor({
      extensions: markdownEditorExtensions(),
      content: markdown,
      contentType: "markdown",
    });
    return fidelityParser.parse(editor.getMarkdown()) === fidelityParser.parse(markdown);
  } catch {
    // Refusing rich editing must leave the original source available.
    return false;
  } finally {
    editor?.destroy();
  }
}
