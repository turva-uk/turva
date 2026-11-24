/**
 * OpenableCell
 *
 * A cell's content, drawn as the keyboard way into its row when given
 * `onOpen`. A row opens on a mouse click anywhere along it, but a row is
 * not something a keyboard can reach, so the first cell's text becomes a
 * button that opens the same row. It looks like the text it wraps, so no
 * table changes layout, and its name is the cell's own text, such as a
 * patient's name, which is what a screen reader user listens for.
 *
 * Only text is wrapped: a control in the first cell, such as a badge
 * with a menu, is left as it is, because a button cannot hold another
 * control.
 *
 * Tabbing to it draws a focus ring round the text, in a colour that shows
 * on the dark page too; see `OpenableCell.module.css`.
 *
 * @example
 * ```tsx
 * <OpenableCell
 *   content={user.name}
 *   onOpen={() => navigate(`/users/${user.id}`)}
 * />
 * ```
 */

import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import CellContent from "./CellContent";
import { isTextContent } from "./cellText";
import classes from "./OpenableCell.module.css";

export interface OpenableCellProps {
  /** What the column's render function returned */
  content: ReactNode;
  /** Opens the row; when given, text content becomes a button */
  onOpen?: () => void;
}

export default function OpenableCell({ content, onOpen }: OpenableCellProps) {
  if (!onOpen || !isTextContent(content)) {
    return <CellContent>{content}</CellContent>;
  }

  return (
    <UnstyledButton className={classes.open} onClick={onOpen}>
      <CellContent>{content}</CellContent>
    </UnstyledButton>
  );
}
