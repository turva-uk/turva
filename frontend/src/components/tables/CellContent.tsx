/**
 * CellContent
 *
 * What a table cell or card field holds, styled as body text only when
 * it is text.
 *
 * Every cell used to be wrapped in `BodyTextInline`, a line of text. A
 * control in that line, a badge, a menu or a drop zone, then sat on the
 * text's baseline like a word, and the room kept below the baseline for
 * letters such as "g" lifted it above the middle of the row. So a
 * control is now rendered as it is, and only text gets the line.
 *
 * Text here means a string or number, a fragment, which is how cells
 * mix words with a date, or `FormattedDate`, a component that renders
 * bare text and would otherwise lose the body style.
 */

import type { ReactNode } from "react";
import { BodyTextInline } from "@/components/typography";
import { isTextContent } from "./cellText";

export interface CellContentProps {
  /** What the column's render function returned */
  children: ReactNode;
}

export default function CellContent({ children }: CellContentProps) {
  return isTextContent(children) ? (
    <BodyTextInline>{children}</BodyTextInline>
  ) : (
    <>{children}</>
  );
}
