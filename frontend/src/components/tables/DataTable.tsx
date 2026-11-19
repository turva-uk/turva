/**
 * DataTable Component
 *
 * A reusable, generic table component for admin pages with responsive layouts.
 * On mobile: displays data in card format with all information visible.
 * On desktop: displays traditional table with striped rows and hover effects.
 * Supports custom column definitions with render functions for flexible content display.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { header: "Name", render: (user) => user.name },
 *     { header: "Email", render: (user) => user.email }
 *   ]}
 *   onRowClick={(user) => navigate(`/users/${user.id}`)}
 *   getRowKey={(user) => user.id}
 *   loading={loading}
 *   error={error}
 * />
 * ```
 */

import type { ReactNode } from "react";
import LiveStatus from "@/components/live-status";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Table,
  Skeleton,
  Stack,
  Center,
  useMantineTheme,
  useComputedColorScheme,
  NativeSelect,
  VisuallyHidden,
} from "@mantine/core";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import { BodyText, BodyTextBold } from "@/components/typography";
import { StateMessage } from "@/components/message-cards";
import { IconAlertCircle } from "@/components/icons/appIcons";
import SortHeader, { type SortDirection } from "./SortHeader";
import TablePagination from "./TablePagination";
import DataCard, { DataCardSkeleton } from "./DataCard";
import CellContent from "./CellContent";
import RowAction from "./RowAction";
import { shouldActivateRow } from "./rowInteraction";
import classes from "./DataTable.module.css";

/**
 * Column definition for DataTable
 */
export interface Column<T> {
  /** Column header text */
  header: string;
  /**
   * Render function for cell content.
   *
   * Plain text is styled for you. Links, specialist controls and custom
   * typography are supported when a column needs them; see `CellContent`
   * for automatic text wrapping.
   */
  render: (row: T) => React.ReactNode;
  /** Optional: custom width */
  width?: string;
  /**
   * Optional: accessor for sorting. When provided, the column becomes
   * sortable. Return a string, number, or Date for comparison.
   */
  accessor?: (row: T) => string | number | Date | null;
}

/**
 * DataTable Props
 */
export interface DataTableProps<T> {
  /** Array of data rows */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Row click handler - receives the row data */
  onRowClick?: (row: T) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Empty state message (default: "No data found") */
  emptyMessage?: string;
  /** Unique key extractor from row data */
  getRowKey: (row: T) => string | number;
  /** Initial rows per page. When set, pagination is shown below the table. */
  pageSize?: number;
  /** Enable full controls: pagination with "Items per page" selector. */
  fullControls?: boolean;
  /**
   * Optional controls (search, filter, an action) rendered above the
   * table, right-aligned. The row is at least 42px tall rather than
   * exactly, so on a narrow screen the controls wrap onto a second line,
   * still right-aligned, instead of overflowing.
   */
  controls?: ReactNode;
  /**
   * Announced to screen readers once loaded, e.g. "3 results" after a
   * search. "Loading" is announced while `loading` is true regardless.
   */
  statusMessage?: string;
  /**
   * The least width a column needs, in rem. Default 8. Multiplied by
   * the column count to find the width below which the table draws
   * cards instead, so a seven-column table gives up on being a table
   * long before a three-column one does. A table with long text can
   * ask for more.
   *
   * 8 rather than 10 because the page container is 1140px wide with
   * 16px padding each side, so a table never has more than 1108px: at
   * 10rem a seven-column table of short values (a name, a code, a badge,
   * a date) was cards even on a wide screen, where it had fitted fine
   * as a table. At 8rem seven columns need 896px and fit; the switch to
   * cards happens at about 900px, where the overflow started.
   */
  minColumnWidth?: number;
  /**
   * The width, in rem, below which this table draws cards, replacing
   * the per-column calculation for a table that knows better.
   */
  cardsBelow?: number;
}

/**
 * How much wider than the need the container must be before cards go
 * back to being a table. Without this margin a switch to cards can
 * change the page's height, bring a scrollbar in, narrow the container
 * by its width and flip the layout straight back.
 */
const CARDS_TO_TABLE_MARGIN_REM = 2;

/** The document's root font size, which is what 1rem is. */
function rootFontSizePx(): number {
  if (typeof document === "undefined") return 16;
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}

/**
 * DataTable displays data in a responsive layout optimized for all screen sizes.
 *
 * Features:
 * - Generic type support for any data structure
 * - Flexible column definitions with custom render functions
 * - Responsive layout: cards on mobile (all data visible), table on desktop
 * - Loading state with skeleton placeholders
 * - Error state with alert message
 * - Empty state with custom message
 * - Striped rows (desktop) / bordered cards (mobile)
 * - Hover highlighting on both layouts
 * - Clickable rows/cards with pointer cursor
 *
 * When it draws cards: below theme.breakpoints.sm always, so a phone never
 * sees a table, and above that whenever its own container is narrower
 * than its columns need (`minColumnWidth` times the column count, or
 * `cardsBelow`). The table measures itself rather than the screen, so a
 * wide table becomes cards at a laptop width where it has to and a
 * narrow one stays a table down to a phone held sideways. Nothing is
 * ever hidden: cards show every column.
 *
 * Used on admin pages for users, safety files, and other resources.
 */
/**
 * DataTable, with a live region that tells screen readers when it is
 * loading and, if the caller says so, how many results it holds. Kept
 * outside the view so the region stays mounted across the loading,
 * empty and loaded states, which is what makes a change announced.
 */
export default function DataTable<T>(props: DataTableProps<T>) {
  const { loading = false, statusMessage = "", error } = props;
  return (
    <>
      <LiveStatus
        message={error ? `Error loading data: ${error}` : loading ? "Loading" : statusMessage}
      />
      <DataTableView {...props} />
    </>
  );
}

function DataTableView<T>({
  data,
  columns,
  onRowClick,
  loading = false,
  error = null,
  emptyMessage = "No data found",
  getRowKey,
  pageSize: initialPageSize,
  fullControls = false,
  controls,
  minColumnWidth = 8,
  cardsBelow,
}: DataTableProps<T>) {
  if (
    initialPageSize !== undefined &&
    (!Number.isSafeInteger(initialPageSize) || initialPageSize < 1)
  ) {
    throw new Error("DataTable pageSize must be a positive integer");
  }
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Does the table fit the space it has? `observedWidth` follows the
  // container through a ResizeObserver, but that first reports after the
  // first paint, which showed a table for one frame before it became
  // cards. So the wrapper is also measured once, before paint, in a
  // layout effect, and that first width stands in until the observer
  // catches up. Both are 0 in jsdom, which does no layout, and then only
  // the viewport rule above decides, exactly as before this was added.
  const { ref: observeRef, width: observedWidth } = useElementSize();
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      observeRef(node);
    },
    [observeRef],
  );
  const [firstWidth, setFirstWidth] = useState(0);
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (node) setFirstWidth(node.getBoundingClientRect().width);
  }, []);
  const width = observedWidth || firstWidth;
  const remPx = useMemo(() => rootFontSizePx(), []);
  const needPx =
    (cardsBelow ?? columns.length * minColumnWidth + (onRowClick ? 2.75 : 0)) * remPx;
  const [tooNarrow, setTooNarrow] = useState(false);
  // Derived state with a margin, set during render as `page` is below:
  // once on cards, stay on cards until there is comfortably room.
  const wantCards = tooNarrow
    ? width <= needPx + CARDS_TO_TABLE_MARGIN_REM * remPx
    : width < needPx;
  if (width > 0 && wantCards !== tooNarrow) {
    setTooNarrow(wantCards);
  }
  const useCards = isMobile || (width > 0 && tooNarrow);
  const colorScheme = useComputedColorScheme("light");
  const isDark = colorScheme === "dark";
  // Turva's purples are paler than Quill's, so these sit darker than
  // Quill's 6 and 5. Dark-mode text (#c9c9c9) is 5.45:1 on shade 9 and
  // 4.50:1 on shade 8; on shade 6 it was 2.92:1, below AA.
  const hoverColor = isDark ? "var(--mantine-color-primary-8)" : undefined;
  const stripedColor = isDark ? "var(--mantine-color-primary-9)" : undefined;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleSort = (columnIndex: number) => {
    if (sortColumnIndex === columnIndex) {
      // Cycle: asc → desc → none
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumnIndex(null);
      }
    } else {
      setSortColumnIndex(columnIndex);
      setSortDirection("asc");
    }
  };

  const cardSortOptions = columns.flatMap((column, index) =>
    column.accessor
      ? [
          { value: `${index}:asc`, label: `${column.header} ascending` },
          { value: `${index}:desc`, label: `${column.header} descending` },
        ]
      : [],
  );

  const sortedData = useMemo(() => {
    if (sortColumnIndex === null) return data;
    const accessor = columns[sortColumnIndex]?.accessor;
    if (!accessor) return data;

    return [...data].sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);

      // Nulls sort last regardless of direction
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      let comparison: number;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = Number(aVal) - Number(bVal);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumnIndex, sortDirection, columns]);

  const totalPages = pageSize ? Math.ceil(sortedData.length / pageSize) : 1;

  // Clamp page to valid range when data shrinks (e.g. after filtering)
  const activePage = Math.min(page, Math.max(totalPages, 1));
  if (activePage !== page) {
    setPage(activePage);
  }

  // Slice data to current page when pagination is active
  const visibleData = pageSize
    ? sortedData.slice((activePage - 1) * pageSize, activePage * pageSize)
    : sortedData;

  // Never slice away records without a way to reach their page. Keep the
  // existing controls for larger datasets, even when they fit on one page.
  const showPagination = pageSize !== undefined && (totalPages > 1 || sortedData.length > 10);
  // Only show nav buttons when there are multiple pages
  const showNav = totalPages > 1;

  // Error state
  if (error) {
    return (
      <div ref={measureRef}>
        <StateMessage
          icon={<IconAlertCircle />}
          title="Error loading data"
          description={error}
          colour="alert"
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    if (useCards) {
      return (
        <Stack gap="md" ref={measureRef}>
          {Array.from({ length: 3 }, (_, i) => (
            <DataCardSkeleton key={i} />
          ))}
        </Stack>
      );
    }

    return (
      <div ref={measureRef}>
        <Table striped stripedColor={stripedColor}>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column, index) => (
                <Table.Th
                  key={index}
                  className={classes.header}
                  style={{ width: column.width }}
                >
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
      </div>
    );
  }

  // Empty state
  if (sortedData.length === 0) {
    return (
      <Stack gap="md" ref={measureRef}>
        {controls && (
          <Group justify="flex-end" mih={42} align="center">
            {controls}
          </Group>
        )}
        <Center p="xl">
          <BodyText>{emptyMessage}</BodyText>
        </Center>
      </Stack>
    );
  }

  // Cards: on a phone, or wherever the columns do not fit. Every column
  // is shown, so nothing is lost by the switch.
  if (useCards) {
    return (
      <Stack gap="md" ref={measureRef}>
        {controls && (
          <Group justify="flex-end" mih={42} align="center">
            {controls}
          </Group>
        )}
        {cardSortOptions.length > 0 && (
          <NativeSelect
            label="Sort rows"
            value={sortColumnIndex === null ? "" : `${sortColumnIndex}:${sortDirection}`}
            data={[{ value: "", label: "Original order" }, ...cardSortOptions]}
            onChange={(event) => {
              const [index, direction] = event.currentTarget.value.split(":");
              const column = Number(index);
              if (
                (direction === "asc" || direction === "desc") &&
                Number.isInteger(column) &&
                columns[column]?.accessor
              ) {
                setSortColumnIndex(column);
                setSortDirection(direction);
              } else setSortColumnIndex(null);
            }}
          />
        )}
        {visibleData.map((row) => (
          <DataCard
            key={getRowKey(row)}
            row={row}
            columns={columns}
            onClick={onRowClick}
            actionLabel={`Open record ${getRowKey(row)}`}
          />
        ))}
        {showPagination && (
          <TablePagination>
            {showNav && (
              <TablePagination.Nav total={totalPages} value={activePage} onChange={setPage} />
            )}
            {fullControls && (
              <TablePagination.PageSize value={pageSize} onChange={handlePageSizeChange} />
            )}
          </TablePagination>
        )}
      </Stack>
    );
  }

  // Table layout, where the columns fit
  return (
    <Stack gap="md" ref={measureRef}>
      {controls && (
        <Group justify="flex-end" mih={42} align="center">
          {controls}
        </Group>
      )}
      <Table
        striped
        stripedColor={stripedColor}
        highlightOnHover
        highlightOnHoverColor={hoverColor}
      >
        <Table.Thead>
          <Table.Tr>
            {columns.map((column, index) => (
              <Table.Th
                key={index}
                className={classes.header}
                style={{ width: column.width }}
                aria-sort={
                  column.accessor
                    ? sortColumnIndex === index
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                    : undefined
                }
              >
                {column.accessor ? (
                  <SortHeader
                    label={column.header}
                    direction={sortColumnIndex === index ? sortDirection : null}
                    onClick={() => handleSort(index)}
                  />
                ) : (
                  <BodyTextBold>{column.header}</BodyTextBold>
                )}
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
          {visibleData.map((row) => (
            <Table.Tr
              key={getRowKey(row)}
              onClick={
                onRowClick
                  ? (event) => {
                      if (shouldActivateRow(event)) onRowClick(row);
                    }
                  : undefined
              }
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((column, index) => (
                <Table.Td
                  key={index}
                  className={classes.cell}
                  style={{ verticalAlign: "middle" }}
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
          ))}
        </Table.Tbody>
      </Table>
      {showPagination && (
        <TablePagination>
          {showNav && (
            <TablePagination.Nav total={totalPages} value={activePage} onChange={setPage} />
          )}
          {fullControls && (
            <TablePagination.PageSize value={pageSize} onChange={handlePageSizeChange} />
          )}
        </TablePagination>
      )}
    </Stack>
  );
}
