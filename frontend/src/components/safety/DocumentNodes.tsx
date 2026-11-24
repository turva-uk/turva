/**
 * DocumentNodes Component
 *
 * One safety document, from the tree of typed nodes Turva's API builds
 * from its committed Markdown (`app/safetyfiles/documents.py`). The server
 * reduces the Markdown to nodes so that nothing in a document can run,
 * load a resource or style the page; this renders those nodes as React
 * elements.
 *
 * It checks the server's allowlist again rather than trusting it, because
 * a renderer that would create whatever tag it was handed is one bad
 * response away from an injection. There is no `dangerouslySetInnerHTML`
 * here, and there must never be: text is always text, links are only the
 * kinds listed below, and nothing loads a resource or applies a style
 * from the document.
 *
 * What Turva leaves out, such as an image or active content, is marked
 * where it was, and the reader is told how many items are not shown. When
 * the server refuses a formatted view, the committed source is shown as
 * text instead.
 *
 * @example
 * ```tsx
 * <DocumentNodes document={detail.document} slug={detail.safety_file.slug} />
 * ```
 */

import { Box, Stack } from "@mantine/core";
import { createElement, type ReactNode } from "react";
import { Link } from "react-router";

import { IconAlertCircle, IconAlertTriangle } from "@/components/icons/appIcons";
import { StateMessage } from "@/components/message-cards";
import { BodyText, Heading } from "@/components/typography";
import { documentPath, type DocumentNode, type SafetyDocumentContent } from "@/lib/safety";

import classes from "./DocumentNodes.module.css";

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
const ALIGN: Record<string, string | undefined> = {
  center: classes.alignCenter,
  right: classes.alignRight,
};
const SAFE_EXTERNAL = /^(https?:\/\/|mailto:)/i;

/** Prefix document ids so a heading can never collide with the app's own. */
function documentAnchor(fragment: string): string {
  return `doc-${fragment}`;
}

function Unsupported({ children }: { children: ReactNode }) {
  return (
    <span className={classes.unsupported} role="note">
      {children}
    </span>
  );
}

function renderAll(nodes: DocumentNode[] | undefined, slug: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index, slug));
}

function renderNode(node: DocumentNode, key: number, slug: string): ReactNode {
  switch (node.type) {
    case "text":
      return node.text;

    case "element": {
      if (node.tag === "table") {
        return (
          // Focusable, so the keyboard can scroll a wide table too.
          <div
            className={classes.table}
            key={key}
            role="region"
            aria-label="Table, scrolls horizontally"
            tabIndex={0}
          >
            <table>{renderAll(node.children, slug)}</table>
          </div>
        );
      }
      if (!TAGS.has(node.tag)) {
        return (
          <Unsupported key={key}>[Not shown: unsupported document formatting.]</Unsupported>
        );
      }

      const attrs = node.attrs ?? {};
      const props: Record<string, unknown> = { key };
      if (attrs.id && /^h[1-6]$/.test(node.tag)) props["id"] = documentAnchor(attrs.id);
      if (node.tag === "ol" && typeof attrs.start === "number") props["start"] = attrs.start;
      if (node.tag === "th" || node.tag === "td") {
        if (typeof attrs.colspan === "number") props["colSpan"] = attrs.colspan;
        if (typeof attrs.rowspan === "number") props["rowSpan"] = attrs.rowspan;
        const align = attrs.align ? ALIGN[attrs.align] : undefined;
        if (align) props["className"] = align;
      }
      if (VOID.has(node.tag)) return createElement(node.tag, props);

      // The page has its own h1, so the document's outline sits beneath it.
      const tag = /^h[1-5]$/.test(node.tag) ? `h${Number(node.tag[1]) + 1}` : node.tag;

      return createElement(tag, props, ...renderAll(node.children, slug));
    }

    case "admonition": {
      const tone = ["danger", "failure", "bug"].includes(node.kind)
        ? classes.danger
        : node.kind === "warning"
          ? classes.warning
          : node.kind === "success"
            ? classes.success
            : undefined;
      const className = [classes.admonition, tone].filter(Boolean).join(" ");
      const body = renderAll(node.children, slug);
      const title = node.title_nodes?.length ? renderAll(node.title_nodes, slug) : node.title;

      if (node.collapsible) {
        return (
          <details key={key} open={node.open === true} className={className}>
            <summary>{title}</summary>
            {body}
          </details>
        );
      }

      return (
        <aside key={key} className={className} aria-label={node.title}>
          <p className={classes.admonitionTitle}>{title}</p>
          {body}
        </aside>
      );
    }

    case "anchor":
      return (
        <a key={key} href={`#${encodeURIComponent(documentAnchor(node.fragment))}`}>
          {renderAll(node.children, slug)}
        </a>
      );

    case "external":
      if (!SAFE_EXTERNAL.test(node.href)) {
        return <span key={key}>{renderAll(node.children, slug)}</span>;
      }
      return (
        <a key={key} href={node.href} rel="noopener noreferrer nofollow">
          {renderAll(node.children, slug)}
          <span className={classes.linkNote}> (external link)</span>
        </a>
      );

    case "document": {
      let path: string;
      try {
        path = documentPath(slug, node.document);
      } catch {
        return (
          <Unsupported key={key}>
            {renderAll(node.children, slug)} [Not followed: invalid document identifier.]
          </Unsupported>
        );
      }
      const fragment = node.fragment
        ? `#${encodeURIComponent(documentAnchor(node.fragment))}`
        : "";

      return (
        // A plain router link, styled by this module as every link in the
        // document is: nothing inside a document carries a style attribute.
        <Link key={key} to={`${path}${fragment}`}>
          {renderAll(node.children, slug)}
        </Link>
      );
    }

    case "reference":
      return (
        <span key={key} className={classes.reference}>
          {" "}
          [{node.text}]
        </span>
      );

    case "unsupported":
      return <Unsupported key={key}>[Not shown: {node.description}]</Unsupported>;

    default:
      return <Unsupported key={key}>[Not shown: unsupported document content.]</Unsupported>;
  }
}

export interface DocumentNodesProps {
  /** The document as the document route sends it */
  document: SafetyDocumentContent;
  /** The safety file's slug, for links to its other documents */
  slug: string;
}

export default function DocumentNodes({ document, slug }: DocumentNodesProps) {
  if (!document.available) {
    const refusedFormatting = document.reason === "unsupported-formatting";

    return (
      <Stack gap="md">
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title={
              refusedFormatting ? "Formatted view unavailable" : "This document cannot be shown"
            }
            description={document.message ?? "Turva could not show this document."}
          />
        </Box>
        {refusedFormatting && typeof document.source === "string" && (
          <Stack component="section" gap="xs">
            <Heading>Committed Markdown source</Heading>
            <div
              role="region"
              aria-label="Committed Markdown source"
              tabIndex={0}
              className={classes.source}
            >
              <pre>
                <code>{document.source}</code>
              </pre>
            </div>
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {document.unsupported > 0 && (
        <StateMessage
          icon={<IconAlertTriangle />}
          colour="warning"
          title="Some content is not shown"
          description={`This document contains ${document.unsupported} ${
            document.unsupported === 1 ? "item" : "items"
          } Turva does not display here, such as images, embedded or active content, or links with unsupported addresses. Each is marked where it occurs. Review the committed source for the complete record.`}
        />
      )}
      {document.blocks.length === 0 ? (
        <BodyText>This document has no content in the committed version.</BodyText>
      ) : (
        <Box className={classes.document}>{renderAll(document.blocks, slug)}</Box>
      )}
    </Stack>
  );
}
