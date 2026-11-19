/**
 * SortHeader Component
 *
 * A clickable column header button that displays the current sort state
 * (ascending, descending, or unsorted) with a chevron indicator.
 * Used inside DataTable for sortable columns.
 */

import { Group, UnstyledButton } from "@mantine/core";
import SortChevron from "@/components/sort/SortChevron";
import { BodyTextBold } from "@/components/typography";
import classes from "./SortHeader.module.css";

export type SortDirection = "asc" | "desc";

export interface SortHeaderProps {
  /** Column header label */
  label: string;
  /** Current sort direction, or null if this column is not the active sort */
  direction: SortDirection | null;
  /** Called when the header is clicked */
  onClick: () => void;
}

export default function SortHeader({ label, direction, onClick }: SortHeaderProps) {
  const chevronDirection =
    direction === "asc" ? "up" : direction === "desc" ? "down" : "neutral";

  return (
    <UnstyledButton
      className={classes.sortHeader}
      onClick={onClick}
      aria-label={`Sort by ${label}`}
    >
      <Group gap={4} wrap="nowrap">
        <BodyTextBold>{label}</BodyTextBold>
        <SortChevron direction={chevronDirection} />
      </Group>
    </UnstyledButton>
  );
}
