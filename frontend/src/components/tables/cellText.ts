/**
 * Whether a table cell's content is text.
 *
 * Kept apart from `CellContent` because a file exporting both a
 * component and a function defeats React's fast refresh.
 *
 * Text means a string or number, a fragment, which is how cells mix
 * words with a date, `FormattedDate` or `CellLines`, components that
 * render bare text and would otherwise lose the body style, or a `<time>`
 * element, which is a date written as HTML and is read as words too.
 */

import { Fragment, isValidElement, type ReactNode } from "react";
import FormattedDate from "@/components/data/Date";
import CellLines from "./CellLines";

export function isTextContent(content: ReactNode): boolean {
  if (typeof content === "string" || typeof content === "number") {
    return true;
  }

  return (
    isValidElement(content) &&
    (content.type === Fragment ||
      content.type === FormattedDate ||
      content.type === CellLines ||
      content.type === "time")
  );
}
