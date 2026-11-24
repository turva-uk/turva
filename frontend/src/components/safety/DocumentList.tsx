/**
 * DocumentList Component
 *
 * A safety file's documents, as links in a row that wraps, so a reader
 * can move between them. The one being read is filled, and a screen
 * reader hears it as the current page. Each link is a real link, so the
 * keyboard reaches each one with Tab.
 *
 * @example
 * ```tsx
 * <DocumentList
 *   documents={detail.documents}
 *   current={detail.document.key}
 *   href={(key) => documentPath(slug, key)}
 * />
 * ```
 */

import { Anchor } from "@mantine/core";
import { Link } from "react-router";

import type { SafetyDocumentSummary } from "@/lib/safety";

import classes from "./DocumentList.module.css";

export interface DocumentListProps {
  /** The file's documents, in the order the server lists them */
  documents: SafetyDocumentSummary[];
  /** The key of the document being read */
  current: string;
  /** Where each document's page is */
  href: (key: string) => string;
}

export default function DocumentList({ documents, current, href }: DocumentListProps) {
  return (
    <nav aria-label="Safety documents">
      <ul className={classes.list}>
        {documents.map((item) => (
          <li key={item.key}>
            <Anchor
              component={Link}
              to={href(item.key)}
              className={classes.link}
              aria-current={item.key === current ? "page" : undefined}
            >
              {item.title}
            </Anchor>
          </li>
        ))}
      </ul>
    </nav>
  );
}
