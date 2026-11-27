/**
 * Filter groups for `DataTableControlled`
 *
 * Builds a table's `filterData` and `filterPredicate` from one or more
 * groups, such as "Standard" and "Visibility". A row passes when, in every
 * group with something chosen, its value is one of those chosen: choices
 * within a group widen the rows, and choices across groups narrow them.
 *
 * A table with no rows offers no filter, since there is nothing to narrow.
 *
 * Each option's value carries its group's key, so two groups can offer the
 * same words without one choice ticking both.
 *
 * @example
 * ```tsx
 * const filters = filterGroups(files, [
 *   { key: "standard", label: "Standard", valueOf: (file) => file.standard },
 * ]);
 * <DataTableControlled {...filters} ... />
 * ```
 */

import type { ComboboxParsedItemGroup } from "@mantine/core";

export interface FilterGroup<T> {
  /** Kept apart from the other groups' keys; never shown */
  key: string;
  /** The group's heading in the filter list */
  label: string;
  /** The words a row shows for this group, which are also what it is filtered by */
  valueOf: (row: T) => string;
  /**
   * The values to offer, in order. Left out, the values the rows hold are
   * offered, sorted, so a value Turva does not know yet can still be chosen.
   */
  values?: readonly string[];
}

export interface TableFilters<T> {
  filterData: ComboboxParsedItemGroup[];
  filterPredicate: (filters: string[]) => (row: T) => boolean;
}

function optionValue(key: string, value: string): string {
  return `${key}:${value}`;
}

export function filterGroups<T>(
  rows: readonly T[],
  groups: readonly FilterGroup<T>[],
): TableFilters<T> {
  // An empty table has nothing to narrow, so it offers no filter at all.
  const offered = rows.length === 0 ? [] : groups;
  const filterData = offered
    .map((group) => {
      const values = group.values ?? [...new Set(rows.map(group.valueOf))].sort();

      return {
        group: group.label,
        items: values.map((value) => ({ value: optionValue(group.key, value), label: value })),
      };
    })
    .filter((group) => group.items.length > 0);

  const filterPredicate = (filters: string[]) => (row: T) =>
    groups.every((group) => {
      const chosen = filters.filter((filter) => filter.startsWith(`${group.key}:`));

      return chosen.length === 0 || chosen.includes(optionValue(group.key, group.valueOf(row)));
    });

  return { filterData, filterPredicate };
}
