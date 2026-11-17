/**
 * Markdown View Component Module
 *
 * Safe markdown-to-HTML renderer with XSS protection using DOMPurify.
 * Supports rich text formatting (bold, italic, lists, links, code blocks)
 * with strict allowlist of HTML tags. Styled to match the app typography
 * system via CSS module. Used for clinical letters and messages.
 */

import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import { ActionIcon, Skeleton, Stack } from "@mantine/core";
import Icon from "@/components/icons/Icon";
import classes from "./MarkdownView.module.css";

/**
 * MarkdownView Props
 */
type Props = {
  /** Markdown source text to render */
  source: string;
  /** If true, return plain text instead of HTML */
  asPlainText?: boolean;
  /** CSS class name for styling */
  className?: string;
  /** Callback when link is clicked (for custom handling) */
  onLinkClick?: (href: string) => void;
  /** Optional child content */
  children?: ReactNode;
  /** Whether markdown is currently loading */
  isLoading?: boolean;
  /**
   * Allow images, and where they live. Off unless given: letters and
   * messages are written by people Turva does not control, and an image
   * there would fetch from wherever its author pointed it.
   *
   * With a base, `![The form](add-a-delegate/form.png)` becomes an image
   * at `<imageBase>/add-a-delegate/form.png`. The address has to be that
   * shape (lower case words, hyphens and slashes, ending in an image
   * type), so it can only ever point beneath the base. Anything else, and
   * any image with no alt text, is left out.
   *
   * An image may also follow a list item, indented beneath it, so a
   * numbered step can carry its screenshot without ending the list.
   */
  imageBase?: string;
  /**
   * Icons the source may show in its text, by name. Off unless given, as
   * images are.
   *
   * With `{ "user-plus": <IconUserPlus /> }`, `:icon-user-plus:` shows
   * that icon in the line, at the size of the text around it, so a step
   * can show the button it means. `:button-user-plus:` shows it inside
   * a filled square, as the app draws an icon-only button, for a button
   * that looks like that on the page. A name not given here is left out.
   */
  icons?: Readonly<Record<string, ReactElement>>;
  /**
   * Draw pipe tables, as GitHub writes them. Off unless asked for: a
   * safety file's documents carry tables, such as the Clinical Safety
   * Officer's details and the severity scale, and without this they
   * showed as a line of pipes. A header row of empty cells is left out,
   * since a table of label and value needs none.
   */
  tables?: boolean;
  /**
   * Leave out HTML comments, `<!-- … -->`. A safety file's template leaves
   * notes for the officer that way, such as the one above the sign-off;
   * the editor shows them, and the published page should not. Without
   * this a comment shows as its own text, as anything else would.
   */
  hideComments?: boolean;
};

/**
 * Allowed HTML tags for markdown rendering.
 * Narrow, explicit allowlist for security (XSS protection).
 */
const ALLOWED_TAGS = [
  "a",
  "strong",
  "em",
  "code",
  "pre",
  "p",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];
const ALLOWED_ATTR = ["href", "rel", "target"];
// Added to the lists above only when the caller gives an `imageBase`.
const IMAGE_TAGS = ["img"];
const IMAGE_ATTR = ["src", "alt", "loading"];
// Added only when the caller gives `icons`. The span is an empty slot the
// icon is drawn into once the markup is on the page.
const ICON_TAGS = ["span"];
const ICON_ATTR = ["data-icon", "data-button", "aria-hidden"];
// Added only when the caller asks for `tables`.
const TABLE_TAGS = ["table", "thead", "tbody", "tr", "th", "td"];

/** A table's row: a line that opens with a pipe. */
const TABLE_ROW = /^\s*\|/;

/**
 * The line under a table's header: a pipe, then cells of dashes with a
 * colon at either end if they like. Checked cell by cell rather than by
 * one pattern, since a pattern for the whole line can be made to take a
 * very long time on untrusted text.
 */
function isTableDivider(line: string | undefined): boolean {
  if (line === undefined || !TABLE_ROW.test(line)) return false;

  return tableCells(line).every((cell) => /^:?-+:?$/.test(cell));
}

/** Whether a table starts at this line: a row with the divider under it. */
function startsTable(lines: readonly string[], i: number): boolean {
  return TABLE_ROW.test(lines[i] ?? "") && isTableDivider(lines[i + 1]);
}

/** One row's cells, without the pipes at either end. `\|` is a pipe in a cell. */
function tableCells(line: string): string[] {
  const inner = line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "");

  return inner.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

/**
 * An icon named in the text: `:icon-user-plus:` on its own, or
 * `:button-user-plus:` drawn as the button it sits on.
 */
const ICON_NAME = /:(icon|button)-([a-z0-9]+(?:-[a-z0-9]+)*):/g;

/** An image address a guide may use: beneath the base, and nowhere else. */
const IMAGE_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.(png|jpe?g|webp)$/;

/** An image on a line of its own, indented under the list item it shows. */
const IMAGE_UNDER_ITEM = /^\s{2,}!\[[^\]]*\]\([^)]+\)\s*$/;

/** An image on a line of its own, indented or not. */
const IMAGE_ONLY = /^\s*!\[[^\]]*\]\([^)]+\)\s*$/;

/** The start of a list item, bulleted or numbered, at any indent. */
const LIST_ITEM = /^\s*([-*]|\d+\.)\s+/;

/**
 * A line that carries on the list item above it: indented, and not a new
 * item, a heading, a code fence or an image.
 *
 * A long item is wrapped in the source with its next line indented, as
 * Markdown allows. Read as a line of its own it ended the list, and every
 * item after it ran together into one paragraph. Only indented lines
 * count, so text straight after a list, with no blank line between,
 * still starts a paragraph as it always has.
 */
function continuesItem(line: string | undefined): line is string {
  return (
    line !== undefined &&
    /^\s+\S/.test(line) &&
    !LIST_ITEM.test(line) &&
    !/^\s*#{1,6}\s/.test(line) &&
    !/^\s*```/.test(line) &&
    !IMAGE_ONLY.test(line)
  );
}

// SSR/Node safety checks
const CAN_USE_DOM = typeof window !== "undefined" && typeof document !== "undefined";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ordinary text escaped for HTML, keeping the few entities Markdown reads
 * as the characters they stand for: `&amp;`, `&lt;`, `&gt;`, `&quot;` and
 * `&#39;`. The editor writes `&` as `&amp;`, and escaping that again
 * showed "&amp;" on the page. Each stays an entity in the HTML, so a `<`
 * written as `&lt;` is still never markup. A code block keeps every
 * entity literal, through `escapeHtml`.
 */
function escapeText(str: string) {
  return str
    .replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Ensure hrefs are safe (allow http/https/mailto/tel/relative/#)
function isSafeUrl(raw: string): boolean {
  try {
    // Allow fragments (#foo) and protocol-relative/relative
    if (
      raw.startsWith("#") ||
      raw.startsWith("/") ||
      raw.startsWith("./") ||
      raw.startsWith("../")
    ) {
      return true;
    }
    const u = new URL(raw);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    // Try treating as relative
    try {
      // Base needed for relative URL parsing

      new URL(raw, "https://example.com/");
      return true;
    } catch {
      return false;
    }
  }
}

// Escape attribute values (we already escape HTML content)
function escapeAttr(str: string) {
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A character Markdown lets a backslash stand before, to mean itself. */
const MARKDOWN_ESCAPE = /\\([\\`*_{}[\]()#+.!|~-])/g;

/**
 * The text without its HTML comments. Found by position rather than by
 * pattern, since the text is untrusted; a comment left open runs to the
 * end, as a browser would read it.
 */
function withoutComments(src: string): string {
  let out = "";
  let from = 0;

  for (;;) {
    const open = src.indexOf("<!--", from);
    if (open === -1) return out + src.slice(from);

    out += src.slice(from, open);
    const close = src.indexOf("-->", open + 4);
    if (close === -1) return out;

    from = close + 3;
  }
}

function inlineFormat(
  raw: string,
  imageBase?: string,
  icons?: Readonly<Record<string, ReactElement>>,
) {
  // Backslash escapes, `cso\_name` for `cso_name`, which the editor
  // writes: taken out before anything else reads the text, so the
  // character stands for itself, and put back last.
  const escaped: string[] = [];
  const unescaped = raw.replace(MARKDOWN_ESCAPE, (_m, char: string) => {
    escaped.push(char);

    return `\u0001${escaped.length - 1}\u0001`;
  });

  // operate on escaped input
  let s = escapeText(unescaped);

  // icons: `:icon-user-plus:` becomes an empty slot, which the component
  // draws the icon into. One the caller did not give is left out.
  if (icons) {
    s = s.replace(ICON_NAME, (_m, look: string, name: string) => {
      if (!Object.hasOwn(icons, name)) return "";

      const button = look === "button" ? ' data-button="true"' : "";

      return `<span data-icon="${name}"${button} aria-hidden="true"></span>`;
    });
  }

  // images: ![alt](path). Taken out first, since an image is a link with
  // a mark in front of it, and put back last, so the bold and italic
  // passes below never see the address or the alt text.
  const images: string[] = [];
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, path) => {
    const trimmedPath = String(path).trim();
    const trimmedAlt = String(alt).trim();
    if (!imageBase || !trimmedAlt || !IMAGE_PATH.test(trimmedPath)) return "";
    const src = escapeAttr(`${imageBase.replace(/\/+$/, "")}/${trimmedPath}`);
    images.push(`<img src="${src}" alt="${escapeAttr(trimmedAlt)}" loading="lazy">`);
    return `\u0000${images.length - 1}\u0000`;
  });

  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
    const trimmedUrl = url.trim();
    const safe = isSafeUrl(trimmedUrl) ? trimmedUrl : "#";
    // text is already escaped by the initial escapeHtml
    const href = escapeAttr(safe);
    return `<a href="${href}" rel="noopener noreferrer nofollow">${text}</a>`;
  });

  // bold **text** or __text__
  s = s.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

  // italic *text* or _text_
  s = s.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

  // inline code `code`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // eslint-disable-next-line no-control-regex -- the marker put in above
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, index: string) => images[Number(index)] ?? "");

  // eslint-disable-next-line no-control-regex -- the marker put in above
  s = s.replace(/\u0001(\d+)\u0001/g, (_m, index: string) =>
    escapeHtml(escaped[Number(index)] ?? ""),
  );

  return s;
}

/**
 * A pipe table, from its header row to the last row that opens with a
 * pipe. Returns the HTML and the line after the table.
 */
/** One line of the source, or "" past either end. */
function lineAt(lines: readonly string[], index: number): string {
  return lines[index] ?? "";
}

function tableToHtml(
  lines: readonly string[],
  start: number,
  imageBase?: string,
  icons?: Readonly<Record<string, ReactElement>>,
): { html: string; next: number } {
  const header = tableCells(lineAt(lines, start));
  const rows: string[][] = [];
  let i = start + 2;

  while (i < lines.length && TABLE_ROW.test(lineAt(lines, i))) {
    rows.push(tableCells(lineAt(lines, i)));
    i++;
  }

  const cell = (tag: "th" | "td", text: string) =>
    `<${tag}>${inlineFormat(text, imageBase, icons)}</${tag}>`;
  const head = header.some((text) => text !== "")
    ? `<thead><tr>${header.map((text) => cell("th", text)).join("")}</tr></thead>`
    : "";
  const body = rows
    .map((row) => `<tr>${row.map((text) => cell("td", text)).join("")}</tr>`)
    .join("");

  return { html: `<table>${head}<tbody>${body}</tbody></table>`, next: i };
}

function mdToHtml(
  src: string,
  imageBase?: string,
  icons?: Readonly<Record<string, ReactElement>>,
  tables = false,
  hideComments = false,
) {
  // The lines of one list, each item with any image indented beneath it.
  const isImageUnderItem = (line: string | undefined) =>
    imageBase !== undefined && line !== undefined && IMAGE_UNDER_ITEM.test(line);

  const text = hideComments ? withoutComments(src) : src;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lineAt(lines, i);
    if (/^\s*$/.test(line)) {
      out.push("");
      i++;
      continue;
    }

    // code fence
    if (/^```/.test(line)) {
      let code = "";
      i++;
      while (i < lines.length && !/^```/.test(lineAt(lines, i))) {
        code += lineAt(lines, i) + "\n";
        i++;
      }
      out.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      if (i < lines.length) i++;
      continue;
    }

    if (tables && startsTable(lines, i)) {
      const table = tableToHtml(lines, i, imageBase, icons);

      out.push(table.html);
      i = table.next;
      continue;
    }

    // headers (safe: avoid adjacent quantified regex parts)
    const hashes = line.match(/^(#{1,6})/);
    if (hashes) {
      const level = (hashes[1] ?? "").length;
      // slice off the hashes, then trim the remaining header text
      const text = line.slice(hashes[0].length).trim();
      out.push(`<h${level}>${inlineFormat(text)}</h${level}>`);
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lineAt(lines, i))) {
        let item = lineAt(lines, i).replace(/^\s*[-*]\s+/, "");
        i++;
        while (isImageUnderItem(lineAt(lines, i)) || continuesItem(lineAt(lines, i))) {
          item += ` ${lineAt(lines, i).trim()}`;
          i++;
        }
        items.push(item);
      }
      const lis = items.map((it) => `<li>${inlineFormat(it, imageBase, icons)}</li>`).join("");
      out.push(`<ul>${lis}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lineAt(lines, i))) {
        let item = lineAt(lines, i).replace(/^\s*\d+\.\s+/, "");
        i++;
        while (isImageUnderItem(lineAt(lines, i)) || continuesItem(lineAt(lines, i))) {
          item += ` ${lineAt(lines, i).trim()}`;
          i++;
        }
        items.push(item);
      }
      const lis = items.map((it) => `<li>${inlineFormat(it, imageBase, icons)}</li>`).join("");
      out.push(`<ol>${lis}</ol>`);
      continue;
    }

    // paragraph (gobble until blank)
    let para = line;
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lineAt(lines, i)) &&
      !(tables && startsTable(lines, i))
    ) {
      para += " " + lineAt(lines, i).trim();
      i++;
    }
    out.push(`<p>${inlineFormat(para, imageBase, icons)}</p>`);
  }

  return out.join("\n");
}

function toPlainText(src: string) {
  // convert to HTML then strip tags safely
  const html = mdToHtml(src);

  if (CAN_USE_DOM) {
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [], // strip everything to text
      ALLOWED_ATTR: [],
    });
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, "text/html");
    return doc.body.textContent || "";
  }
  // fallback: very simple tag strip + minimal entity decode
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
}

export default function MarkdownView({
  source,
  asPlainText = false,
  className,
  onLinkClick,
  children,
  isLoading = false,
  imageBase,
  icons,
  tables = false,
  hideComments = false,
}: Props) {
  // 1) Render markdown to HTML
  const rawHtml = useMemo(() => {
    if (asPlainText) return toPlainText(source);
    return mdToHtml(source, imageBase, icons, tables, hideComments);
  }, [source, asPlainText, imageBase, icons, tables, hideComments]);

  // 2) Sanitize final HTML before any injection
  const sanitizedHtml = useMemo(() => {
    if (asPlainText) return rawHtml;
    if (!CAN_USE_DOM) {
      // SSR: safest is to return plain text rather than unsanitized HTML
      return rawHtml.replace(/<[^>]+>/g, "");
    }
    const withImages = imageBase !== undefined;
    const withIcons = icons !== undefined;
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        ...ALLOWED_TAGS,
        ...(withImages ? IMAGE_TAGS : []),
        ...(withIcons ? ICON_TAGS : []),
        ...(tables ? TABLE_TAGS : []),
      ],
      ALLOWED_ATTR: [
        ...ALLOWED_ATTR,
        ...(withImages ? IMAGE_ATTR : []),
        ...(withIcons ? ICON_ATTR : []),
      ],
    });
  }, [rawHtml, asPlainText, imageBase, icons, tables]);

  // An image that will not load is swapped for its alt text in a plain
  // box. A guide's screenshots are retaken and uploaded apart from the
  // app, so for a while after a new guide ships its pictures may not be
  // there yet, and a row of broken images says less than the words do.
  //
  // The markup is injected, so React cannot put a handler on each image.
  // `error` does not bubble, which is why this listens in the capture
  // phase, on the element that holds them all.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || imageBase === undefined) return undefined;

    const showAltInstead = (image: HTMLImageElement) => {
      const box = document.createElement("span");
      box.className = classes.missingImage ?? "";
      box.textContent = image.alt;
      image.replaceWith(box);
    };
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        showAltInstead(event.target);
      }
    };

    root.addEventListener("error", onError, true);
    // One that failed before this ran: it will not say so again.
    root.querySelectorAll("img").forEach((image) => {
      if (image.complete && image.naturalWidth === 0 && image.currentSrc) {
        showAltInstead(image);
      }
    });
    return () => root.removeEventListener("error", onError, true);
  }, [sanitizedHtml, imageBase]);

  // The slots an icon is drawn into. The markup is injected, so React
  // only learns of them once it is on the page, and draws each icon into
  // its slot through a portal, with the app's own Icon component.
  const [iconSlots, setIconSlots] = useState<HTMLElement[]>([]);
  useEffect(() => {
    const root = rootRef.current;
    const slots =
      root && icons ? [...root.querySelectorAll<HTMLElement>("span[data-icon]")] : [];

    setIconSlots(slots);
  }, [sanitizedHtml, icons]);

  // Show loading skeleton (after hooks to follow rules of hooks)
  if (isLoading) {
    return (
      <div className={className}>
        <Stack gap="md">
          <Skeleton height={40} width="60%" radius="md" />
          <Skeleton height={100} radius="md" />
          <Skeleton height={30} width="80%" radius="md" />
          <Skeleton height={80} radius="md" />
          <Skeleton height={30} width="70%" radius="md" />
        </Stack>
      </div>
    );
  }

  function handleClick(e: React.MouseEvent) {
    // The click lands on whatever is innermost, which for a link written
    // `[**Users**](/admin/users)` is the bold text and not the link.
    const link = e.target instanceof Element ? e.target.closest("a") : null;
    if (link) {
      const href = link.getAttribute("href") || "";
      if (onLinkClick) {
        e.preventDefault();
        onLinkClick(href);
      }
    }
  }

  const combinedClassName = [classes.markdown, className].filter(Boolean).join(" ");

  if (asPlainText) {
    return (
      <div className={combinedClassName}>
        <pre style={{ whiteSpace: "pre-wrap" }}>{rawHtml}</pre>
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Delegated handler for the links inside the rendered markdown. The
          links are real anchors, so Enter on one fires this click too; the
          div itself is not interactive. */}
      <div
        ref={rootRef}
        className={combinedClassName}
        onClick={handleClick}
        // Sanitised by DOMPurify, with the strict ALLOWED_TAGS and ALLOWED_ATTR above.
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
      {iconSlots.map((slot, index) => {
        const icon = icons?.[slot.dataset.icon ?? ""];

        if (!icon) return null;

        // A picture of the button, not a button: a span, so it cannot be
        // clicked or reached with Tab, and hidden from screen readers
        // with its slot.
        const drawn =
          slot.dataset.button === "true" ? (
            <ActionIcon component="span" size="md" className={classes.button}>
              <Icon icon={icon} size="sm" />
            </ActionIcon>
          ) : (
            <Icon icon={icon} size="sm" />
          );

        return createPortal(drawn, slot, String(index));
      })}
    </>
  );
}
