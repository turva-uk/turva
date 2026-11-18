import { Anchor, Box, Text } from "@mantine/core";
import { createElement, type ReactNode } from "react";
import { Link } from "react-router";

import type { DocumentNode } from "../api/types";

/**
 * Render an allowlisted document tree as React elements.
 *
 * The API has already reduced committed Markdown to typed nodes; this checks
 * the allowlist again rather than trusting it, because a renderer that would
 * create whatever tag it was handed is one bad response away from an
 * injection. There is no `dangerouslySetInnerHTML` here and there must never
 * be: text is always text, links are only the kinds listed below, and nothing
 * loads a resource or applies a style from the document.
 */
const TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "br",
  "strong",
  "em",
  "del",
  "sup",
  "sub",
  "dl",
  "dt",
  "dd",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
]);
const VOID = new Set(["hr", "br"]);
const ALIGN = new Set(["left", "center", "right"]);
const SAFE_EXTERNAL = /^(https?:\/\/|mailto:)/i;

/** Prefix document ids so a heading can never collide with the app's own. */
function documentAnchor(fragment: string) {
  return `doc-${fragment}`;
}

interface Context {
  slug: string;
}

function children(nodes: DocumentNode[] | undefined, context: Context): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index, context));
}

function renderNode(node: DocumentNode, key: number, context: Context): ReactNode {
  switch (node.type) {
    case "text":
      return node.text;
    case "element": {
      if (node.tag === "table") {
        return (
          // Wide tables scroll inside their own region on a phone rather than
          // widening the page; the region is focusable so the keyboard can
          // scroll it too.
          <div
            className="document-table"
            key={key}
            role="region"
            aria-label="Table, scrolls horizontally"
            tabIndex={0}
          >
            <table>{children(node.children, context)}</table>
          </div>
        );
      }
      if (!TAGS.has(node.tag)) {
        return <span key={key}>{children(node.children, context)}</span>;
      }
      const attrs = node.attrs ?? {};
      const props: Record<string, unknown> = { key };
      if (attrs.id && /^h[1-6]$/.test(node.tag)) props.id = documentAnchor(attrs.id);
      if (node.tag === "ol" && typeof attrs.start === "number") props.start = attrs.start;
      if (node.tag === "th" || node.tag === "td") {
        if (typeof attrs.colspan === "number") props.colSpan = attrs.colspan;
        if (typeof attrs.rowspan === "number") props.rowSpan = attrs.rowspan;
        if (attrs.align && ALIGN.has(attrs.align)) props.className = `align-${attrs.align}`;
      }
      if (VOID.has(node.tag)) return createElement(node.tag, props);
      // The page already has its own h1; the document's outline sits beneath it.
      const tag = /^h[1-5]$/.test(node.tag) ? `h${Number(node.tag[1]) + 1}` : node.tag;
      return createElement(tag, props, ...children(node.children, context));
    }
    case "admonition": {
      const tone = ["danger", "failure", "bug", "warning"].includes(node.kind)
        ? node.kind === "warning"
          ? "warning"
          : "danger"
        : node.kind === "success"
          ? "success"
          : "note";
      const body = children(node.children, context);
      if (node.collapsible) {
        return (
          <details key={key} className={`document-admonition document-admonition-${tone}`}>
            <summary>{node.title}</summary>
            {body}
          </details>
        );
      }
      return (
        <aside
          key={key}
          className={`document-admonition document-admonition-${tone}`}
          aria-label={node.title}
        >
          <p className="document-admonition-title">{node.title}</p>
          {body}
        </aside>
      );
    }
    case "anchor":
      return (
        <a key={key} href={`#${documentAnchor(node.fragment)}`}>
          {children(node.children, context)}
        </a>
      );
    case "external":
      if (!SAFE_EXTERNAL.test(node.href)) {
        return <span key={key}>{children(node.children, context)}</span>;
      }
      return (
        <Anchor key={key} href={node.href} rel="noopener noreferrer nofollow">
          {children(node.children, context)}
          <span className="document-link-note"> (external link)</span>
        </Anchor>
      );
    case "document":
      return (
        <Anchor
          key={key}
          component={Link}
          to={`/safety-files/${context.slug}/documents/${encodeURIComponent(node.document)}${
            node.fragment ? `#${documentAnchor(node.fragment)}` : ""
          }`}
        >
          {children(node.children, context)}
        </Anchor>
      );
    case "reference":
      return (
        <span key={key} className="document-reference">
          {" "}
          [{node.text}]
        </span>
      );
    case "unsupported":
      return (
        <span key={key} className="document-unsupported" role="note">
          [Not shown: {node.description}]
        </span>
      );
    default:
      return null;
  }
}

export function SafetyDocument({ blocks, slug }: { blocks: DocumentNode[]; slug: string }) {
  if (blocks.length === 0) {
    return <Text>This document has no content in the committed version.</Text>;
  }
  return <Box className="safety-document">{children(blocks, { slug })}</Box>;
}
