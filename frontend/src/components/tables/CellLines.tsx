/**
 * CellLines
 *
 * Several values in one table cell, one to a line. Wrapped text means
 * independent cells do not reliably line up. Show paired values in
 * shared rows or include matching identifiers; do not infer an owner
 * from its visual position beside a mitigation in another cell.
 *
 * Bare text, like `FormattedDate`, so `CellContent` gives it the body
 * text style; `cellText.ts` names it for that reason.
 *
 * ```tsx
 * { header: "Mitigation", render: (h) => <CellLines lines={h.mitigations.map((m) => m.title)} /> }
 * ```
 */

import { Fragment } from "react";

export interface CellLinesProps {
  /** The values, one to a line, in the order given */
  lines: string[];
  /** Shown when there are none. Defaults to "-", as an empty cell is. */
  empty?: string;
}

export default function CellLines({ lines, empty = "-" }: CellLinesProps) {
  if (lines.length === 0) return <>{empty}</>;

  return (
    <>
      {lines.map((line, index) => (
        // Two lines may say the same, two mitigations with no owner.
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
