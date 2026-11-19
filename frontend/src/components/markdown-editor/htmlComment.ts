/**
 * An HTML comment, `<!-- … -->`, as a note in the editor.
 *
 * A safety file's template leaves notes for the officer as comments, such
 * as the one above the sign-off saying it is completed at approval. The
 * published page does not show them. The editor did not either: it had
 * no node for a comment, dropped it on reading, and saving wrote the
 * document back without it. This node shows the note in the editor,
 * marked as not shown on the published page, and writes it back exactly
 * as it came in, its line breaks and spacing included.
 *
 * The note is not edited in place: it is one block, which can be kept or
 * deleted. Any other HTML is left to the Markdown extension, as before.
 */

import { Node, type JSONContent, type MarkdownToken } from "@tiptap/core";
import classes from "./MarkdownEditor.module.css";

const OPEN = "<!--";
const CLOSE = "-->";

/**
 * What lies between a comment's markers, when the HTML is one comment
 * and nothing else. Found by position rather than by pattern, since the
 * text is untrusted.
 */
export function commentBody(html: string): string | null {
  const raw = html.trim();

  if (!raw.startsWith(OPEN) || !raw.endsWith(CLOSE)) return null;

  const body = raw.slice(OPEN.length, raw.length - CLOSE.length);

  // A second comment, or text after the first, is not one comment.
  if (body.includes(CLOSE)) return null;

  return body;
}

export const HtmlComment = Node.create({
  name: "htmlComment",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      // Everything between the markers, untouched, so it is written back
      // as it was read.
      body: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-html-comment]",
        getAttrs: (element) => ({
          body: element.getAttribute("data-body") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const body = String(node.attrs["body"] ?? "");

    return [
      "div",
      {
        "data-html-comment": "",
        "data-body": body,
        class: classes.comment,
      },
      ["strong", {}, "Note, not shown on the published page: "],
      body.trim(),
    ];
  },

  markdownTokenName: "html",

  // Nothing, an empty list, for HTML that is not a comment on its own
  // lines: the Markdown extension then reads it as it always has.
  parseMarkdown: (token: MarkdownToken) => {
    const body = commentBody(token.raw ?? token.text ?? "");

    if (body === null || token.block === false) return [];

    const node: JSONContent = { type: "htmlComment", attrs: { body } };

    return node;
  },

  renderMarkdown: (node: JSONContent) => `${OPEN}${String(node.attrs?.["body"] ?? "")}${CLOSE}`,
});
