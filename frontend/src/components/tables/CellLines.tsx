/**
 * CellLines
 *
 * Several values in one table cell, one to a line. Two columns given
 * lists of the same length line up, so a value and the one beside it in
 * the next column read across: a hazard's mitigations, and each
 * mitigation's owner.
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
