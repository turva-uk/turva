/**
 * DataTableWithResults Component
 *
 * A table that supports optional full-width sub-rows beneath data rows.
 * Designed for displaying operation results where some rows need
 * additional detail (e.g. failure reasons, validation messages).
 *
 * Sub-rows span all columns with a subtle background tint to
 * visually group them with their parent row.
 *
 * @example
 * ```tsx
 * <DataTableWithResults
 *   data={modules}
 *   columns={[
 *     { header: "Module", render: (m) => m.title },
 *     { header: "Status", render: (m) => m.status },
 *   ]}
 *   getRowKey={(m) => m.id}
 *   getSubRow={(m) => m.error ? <BodyTextInline>{m.error}</BodyTextInline> : null}
 * />
 * ```
 */

import { Fragment, type ReactNode } from "react";
import LiveStatus from "@/components/live-status";
import {
  Center,
  Skeleton,
  Stack,
  Table,
  useComputedColorScheme,
  useMantineTheme,
  VisuallyHidden,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import DataCard, { DataCardSkeleton } from "./DataCard";
import CellContent from "./CellContent";
import RowAction from "./RowAction";
import { shouldActivateRow } from "./rowInteraction";
import { BodyText, BodyTextBold } from "@/components/typography";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface ResultColumn<T> {
  /** Column header text */
  header: string;
  /** Render function for cell content */
  render: (row: T) => ReactNode;
  /** Optional: custom width */
  width?: string;
}

export interface DataTableWithResultsProps<T> {
  /** Array of data rows */
  data: T[];
  /** Column definitions */
  columns: ResultColumn<T>[];
  /** Unique key extractor from row data */
  getRowKey: (row: T) => string | number;
  /**
   * Return content for a full-width sub-row beneath this row,
   * or null/undefined to show no sub-row.
   */
  getSubRow?: (row: T) => ReactNode | null;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Empty state message (default: "No data found") */
  emptyMessage?: string;
  /** Whether data is loading */
  loading?: boolean;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

/** DataTableWithResults, announcing "Loading" to screen readers. */
export default function DataTableWithResults<T>(props: DataTableWithResultsProps<T>) {
  return (
    <>
      <LiveStatus message={props.loading ? "Loading" : ""} />
      <DataTableWithResultsView {...props} />
    </>
  );
}

function DataTableWithResultsView<T>({
  data,
  columns,
  getRowKey,
  getSubRow,
  onRowClick,
  emptyMessage = "No data found",
  loading = false,
}: DataTableWithResultsProps<T>) {
  const theme = useMantineTheme();
  // Cards on a phone, as `DataTable` draws them: a table of several
  // columns does not fit a narrow screen and scrolls sideways instead.
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const colorScheme = useComputedColorScheme("light");
  const isDark = colorScheme === "dark";

  const stripeBg = isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-gray-0)";

  if (loading && isMobile) {
    return (
      <Stack gap="md">
        {Array.from({ length: 3 }, (_, index) => (
          <DataCardSkeleton key={index} />
        ))}
      </Stack>
    );
  }

  if (loading) {
    return (
      <Table>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column, index) => (
              <Table.Th key={index} style={{ width: column.width }}>
                <BodyTextBold>{column.header}</BodyTextBold>
              </Table.Th>
            ))}
            {onRowClick && (
              <Table.Th scope="col">
                <VisuallyHidden>Record actions</VisuallyHidden>
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {columns.map((_, colIndex) => (
                <Table.Td key={colIndex}>
                  <Skeleton height={25} mt={4} mb={4} />
                </Table.Td>
              ))}
              {onRowClick && (
                <Table.Td>
                  <Skeleton height={25} w={50} mt={4} mb={4} />
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  if (data.length === 0) {
    return (
      <Center p="xl">
        <BodyText>{emptyMessage}</BodyText>
      </Center>
    );
  }

  // The sub-row becomes the card's footer, under the fields.
  if (isMobile) {
    return (
      <Stack gap="md">
        {data.map((row) => (
          <DataCard
            key={getRowKey(row)}
            row={row}
            columns={columns}
            onClick={onRowClick}
            actionLabel={`Open record ${getRowKey(row)}`}
            footer={getSubRow?.(row) ?? null}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column, index) => (
            <Table.Th key={index} style={{ width: column.width }}>
              <BodyTextBold>{column.header}</BodyTextBold>
            </Table.Th>
          ))}
          {onRowClick && (
            <Table.Th scope="col">
              <VisuallyHidden>Record actions</VisuallyHidden>
            </Table.Th>
          )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map((row, rowIndex) => {
          const subRowContent = getSubRow?.(row) ?? null;
          const hasSubRow = subRowContent !== null && typeof subRowContent !== "boolean";
          const isStriped = rowIndex % 2 === 1;
          const rowBg = isStriped ? stripeBg : undefined;
          return (
            <Fragment key={getRowKey(row)}>
              <Table.Tr
                bg={rowBg}
                style={{
                  ...(hasSubRow ? { borderBottom: "none" } : {}),
                  ...(onRowClick ? { cursor: "pointer" } : {}),
                }}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (shouldActivateRow(event)) onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((column, index) => (
                  <Table.Td
                    key={index}
                    style={{ verticalAlign: "middle" }}
                    pb={hasSubRow ? 0 : undefined}
                  >
                    <CellContent>{column.render(row)}</CellContent>
                  </Table.Td>
                ))}
                {onRowClick && (
                  <Table.Td>
                    <RowAction
                      label={`Open record ${getRowKey(row)}`}
                      onOpen={() => onRowClick(row)}
                    />
                  </Table.Td>
                )}
              </Table.Tr>
              {hasSubRow && (
                <Table.Tr bg={rowBg} style={{ borderTop: "none" }}>
                  <Table.Td
                    colSpan={columns.length + (onRowClick ? 1 : 0)}
                    pt={0}
                    pb="sm"
                    px="md"
                  >
                    {subRowContent}
                  </Table.Td>
                </Table.Tr>
              )}
            </Fragment>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
