/**
 * DataTableControlled Component
 *
 * A higher-level wrapper around DataTable that integrates search and filter
 * controls. Provides SearchProvider context, SearchField, and optional
 * FilterSelect as built-in controls so pages don't need to wire state manually.
 *
 * The filter button shows only when the page gives options to filter by
 * and a predicate to apply them. A button that opens onto nothing reads
 * as broken, so a table with nothing to filter has search alone.
 *
 * @example
 * ```tsx
 * <DataTableControlled
 *   data={users}
 *   columns={columns}
 *   getRowKey={(u) => u.id}
 *   pageSize={10}
 *   filterData={filterGroups}
 *   filterLabel="Filter users"
 *   searchFields={(row) => [row.name, row.email]}
 * />
 * ```
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ComboboxParsedItemGroup } from "@mantine/core";
import { SearchProvider, useSearch } from "@/lib/search";
import SearchField from "@/components/search";
import FilterSelect from "@/components/form/FilterSelect";
import DataTable, { type Column } from "./DataTable";

export interface DataTableControlledProps<T> {
  /** Array of data rows */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Empty state message */
  emptyMessage?: string;
  /** Unique key extractor */
  getRowKey: (row: T) => string | number;
  /** Rows per page (enables pagination) */
  pageSize?: number;
  /** Grouped filter options for FilterSelect */
  filterData?: (string | ComboboxParsedItemGroup)[];
  /** Label for the filter popover */
  filterLabel?: string;
  /** Accessibility label for filter button */
  filterAriaLabel?: string;
  /**
   * Extract searchable strings from a row. All returned strings are
   * matched against the search query (case-insensitive).
   */
  searchFields: (row: T) => (string | null | undefined)[];
  /**
   * Optional: resolve filter values to a predicate. Receives current
   * filter selections and returns a function that tests each row.
   * When not provided, filtering is disabled even if filterData is set.
   */
  filterPredicate?: (filters: string[]) => (row: T) => boolean;
  /**
   * Optional: called whenever the filtered dataset changes.
   * Useful for pages that display stats based on the visible data.
   */
  onFilteredData?: (data: T[]) => void;
  /**
   * Optional: a control for the table's own action, such as an "Add"
   * button, shown in the same row as search and filter, before them.
   */
  action?: ReactNode;
  /** The table's caption, shown under it and read out as its name. See `DataTable`. */
  caption?: string;
}

function DataTableControlledInner<T>({
  data,
  columns,
  onRowClick,
  loading,
  error,
  emptyMessage,
  getRowKey,
  pageSize = 10,
  filterData,
  filterLabel = "Filter",
  filterAriaLabel = "Filter",
  searchFields,
  filterPredicate,
  onFilteredData,
  caption,
  action,
}: DataTableControlledProps<T>) {
  const [filters, setFilters] = useState<string[]>([]);
  const { query, setQuery } = useSearch();

  const filteredData = useMemo(() => {
    let result = data;

    // Apply category filters
    if (filters.length > 0 && filterPredicate) {
      const predicate = filterPredicate(filters);
      result = result.filter(predicate);
    }

    // Apply search query
    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter((row) =>
        searchFields(row).some((field) => field?.toLowerCase().includes(lower)),
      );
    }

    return result;
  }, [data, filters, filterPredicate, query, searchFields]);

  useEffect(() => {
    onFilteredData?.(filteredData);
  }, [filteredData, onFilteredData]);

  const hasFilters =
    filterData !== undefined && filterData.length > 0 && filterPredicate !== undefined;

  const controls = (
    <>
      {action}
      <SearchField value={query} onChange={setQuery} variant="light" />
      {hasFilters && (
        <FilterSelect
          data={filterData}
          value={filters}
          onChange={setFilters}
          label={filterLabel}
          aria-label={filterAriaLabel}
        />
      )}
    </>
  );

  // Say how many rows are left once a search or filter narrows them,
  // since a sighted user sees the table shrink and nobody else does.
  const narrowed = query.trim() !== "" || filters.length > 0;
  const statusMessage = narrowed
    ? `${filteredData.length} ${filteredData.length === 1 ? "result" : "results"}`
    : "";

  return (
    <DataTable
      statusMessage={statusMessage}
      data={filteredData}
      columns={columns}
      onRowClick={onRowClick}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
      getRowKey={getRowKey}
      pageSize={pageSize}
      fullControls
      controls={controls}
      caption={caption}
    />
  );
}

/**
 * DataTableControlled
 *
 * Wraps DataTable with integrated search and filter controls.
 * Provides its own SearchProvider so pages don't need to set one up.
 */
export default function DataTableControlled<T>(props: DataTableControlledProps<T>) {
  return (
    <SearchProvider>
      <DataTableControlledInner {...props} />
    </SearchProvider>
  );
}
