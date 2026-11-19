import { Marked, Renderer } from "marked";

interface RenderOptions {
  imageBase?: string;
  icons?: ReadonlySet<string>;
  tables?: boolean;
  hideComments?: boolean;
}

const ICON = /^:(icon|button)-([a-z0-9]+(?:-[a-z0-9]+)*):/;
const IMAGE_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.(png|jpe?g|webp)$/;

/** Escape generated attributes and raw HTML, never the Markdown before parsing. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(value: string): boolean {
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(
      new URL(value, "https://example.com/").protocol,
    );
  } catch {
    return false;
  }
}

/** Only called on an HTML-comment token, not on code or the source document. */
function withoutComments(text: string): string {
  let result = "";
  let from = 0;
  for (;;) {
    const start = text.indexOf("<!--", from);
    if (start === -1) return result + text.slice(from);
    result += text.slice(from, start);
    const end = text.indexOf("-->", start + 4);
    if (end === -1) return result;
    from = end + 3;
  }
}

/**
 * Marked owns Markdown parsing. These hooks enforce Turva's rendering policy;
 * the caller must still sanitise the resulting HTML before inserting it.
 * Each call has its own instance so one view cannot enable another's features.
 */
export function renderMarkdown(
  source: string,
  { imageBase, icons, tables = false, hideComments = false }: RenderOptions = {},
): string {
  const marked = new Marked({
    async: false,
    gfm: true,
    breaks: false,
    tokenizer: {
      // `false` delegates to Marked; `undefined` disables just this tokenizer.
      table() {
        return tables ? false : undefined;
      },
    },
    renderer: {
      html({ text }) {
        // Raw HTML is visible text, never executable markup. Only actual
        // comment tokens are hidden; comments inside code remain literal.
        return escapeHtml(hideComments && /^\s*<!--/.test(text) ? withoutComments(text) : text);
      },
      link({ href, tokens }) {
        const safe = isSafeUrl(href) ? href : "#";
        return `<a href="${escapeHtml(safe)}" rel="noopener noreferrer nofollow">${this.parser.parseInline(tokens)}</a>`;
      },
      image({ href, text }) {
        const path = href.trim();
        const alt = text.trim();
        if (!imageBase || !alt || !IMAGE_PATH.test(path)) return "";
        return `<img src="${escapeHtml(`${imageBase.replace(/\/+$/, "")}/${path}`)}" alt="${escapeHtml(alt)}" loading="lazy">`;
      },
      checkbox({ checked }) {
        // Read-only document content, not a new interactive form control.
        return checked ? "[x] " : "[ ] ";
      },
      table(token) {
        if (token.header.some((cell) => cell.text.trim() !== "")) {
          return Renderer.prototype.table.call(this, token);
        }
        // A label/value table deliberately has no empty header row. Marked
        // still owns cell parsing, including escaped pipes and inline code.
        const rows = token.rows
          .map((row) =>
            this.tablerow({ text: row.map((cell) => this.tablecell(cell)).join("") }),
          )
          .join("");
        return `<table><tbody>${rows}</tbody></table>`;
      },
    },
  });

  if (icons !== undefined) {
    marked.use({
      extensions: [
        {
          name: "turvaIcon",
          level: "inline",
          start(text) {
            const index = text.search(/:(?:icon|button)-/);
            return index === -1 ? undefined : index;
          },
          tokenizer(text) {
            const match = ICON.exec(text);
            if (!match) return undefined;
            return { type: "turvaIcon", raw: match[0] };
          },
          renderer(token) {
            const match = ICON.exec(token.raw);
            const name = match?.[2];
            if (!name || !icons.has(name)) return "";
            const button = match[1] === "button" ? ' data-button="true"' : "";
            return `<span data-icon="${name}"${button} aria-hidden="true"></span>`;
          },
        },
      ],
    });
  }

  return marked.parse(source, { async: false });
}
