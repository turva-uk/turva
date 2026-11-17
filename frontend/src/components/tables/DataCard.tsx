/**
 * DataCard Component
 *
 * A reusable card component for displaying a single data row in a mobile-friendly
 * card layout. Used by DataTable for its mobile view, but can also be used
 * independently for card-based layouts.
 *
 * Each column is rendered as a labelled field with a divider between fields.
 *
 * **A last column with an empty header is the row's action**, such as an
 * `EllipsisMenu`. A table leaves that header blank so its heading cell is
 * empty; labelled here it read as a bare ":" on a line of its own at the
 * foot of the card. So it is drawn unlabelled at the card's top right
 * instead, in the corner, beside the first row only: the rows beneath it
 * keep the card's full width. Only the last column: an empty header
 * anywhere else is left as a field, since nothing says it is an action.
 *
 * @example
 * ```tsx
 * <DataCard
 *   row={user}
 *   columns={[
 *     { header: "Name", render: (user) => user.name },
 *     { header: "Email", render: (user) => user.email },
 *   ]}
 *   onClick={(user) => navigate(`/users/${user.id}`)}
 * />
 * ```
 */

import type { ReactNode } from "react";
import { Group, Skeleton, Stack } from "@mantine/core";
import Divider from "@/components/divider/Divider";
import { BodyTextBold } from "@/components/typography";
import CellContent from "./CellContent";
import type { Column } from "./DataTable";
import BaseCard from "@/components/base-card/BaseCard";
import classes from "./DataCard.module.css";

export interface DataCardProps<T> {
  /** The data row to display */
  row: T;
  /** Column definitions (header labels + render functions) */
  columns: Column<T>[];
  /** Click handler - receives the row data */
  onClick: (row: T) => void;
  /** Loading state - shows skeleton placeholders */
  loading?: boolean;
  /**
   * Full-width content beneath the fields, such as the reason an
   * operation failed. What `DataTableWithResults` shows as a sub-row on
   * a wide screen, it shows here on a phone.
   */
  footer?: ReactNode;
}

/**
 * A card's place while its row loads: three fields' worth of skeleton.
 * Takes no row, because there is none yet.
 */
export function DataCardSkeleton() {
  return (
    <BaseCard>
      <Stack gap="sm">
        <Skeleton height={30} mt={1} mb={1} />
        <Divider />
        <Skeleton height={30} mt={1} mb={1} />
        <Divider />
        <Skeleton height={30} mt={1} mb={1} />
      </Stack>
    </BaseCard>
  );
}

/**
 * DataCard renders a single data row as a bordered card with labelled fields.
 *
 * Each column is shown as a bold header label followed by the rendered content,
 * separated by dividers. The entire card is clickable.
 */
export default function DataCard<T>({
  row,
  columns,
  onClick,
  loading = false,
  footer,
}: DataCardProps<T>) {
  if (loading) {
    return <DataCardSkeleton />;
  }

  const last = columns[columns.length - 1];
  const action = last && last.header.trim() === "" ? last : null;
  const fields = action ? columns.slice(0, -1) : columns;

  const body = (
    <Stack gap="sm">
      {fields.map((column, index) => {
        const content = column.render(row);
        // Only the first row shares its line with the action, so only it
        // leaves room; every row below has the card's full width.
        const besideAction = action !== null && index === 0;
        return (
          <div key={index} className={classes.field}>
            {/* The room is kept on the text, not the row, so the divider
                beneath still runs the card's full width. */}
            <Group
              gap="xs"
              wrap="nowrap"
              align="center"
              className={besideAction ? classes.besideAction : undefined}
            >
              <span className={classes.header}>
                <BodyTextBold>{column.header}:</BodyTextBold>
              </span>
              <CellContent>{content}</CellContent>
            </Group>
            {index < fields.length - 1 && <Divider mt="sm" />}
          </div>
        );
      })}
      {footer && (
        <>
          <Divider />
          {footer}
        </>
      )}
    </Stack>
  );

  return (
    <BaseCard onClick={() => onClick(row)} style={{ cursor: "pointer" }}>
      {action ? (
        <div className={classes.withAction}>
          {body}
          <div className={classes.action} data-testid="data-card-action">
            {action.render(row)}
          </div>
        </div>
      ) : (
        body
      )}
    </BaseCard>
  );
}
