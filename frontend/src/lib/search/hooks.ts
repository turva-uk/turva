/**
 * Search hooks
 *
 * Consumer hooks for the search context.
 */

import { useContext, useMemo } from "react";
import { SearchContext, type SearchContextValue } from "./searchContext";

/** Fallback for components rendered outside SearchProvider */
const fallback: SearchContextValue = {
  query: "",
  setQuery: () => {},
  showSearch: false,
  setShowSearch: () => {},
};

/**
 * useSearch - access the global search query and setter.
 * Returns a no-op fallback when used outside SearchProvider (e.g. TeachingLayout).
 */
export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  return context ?? fallback;
}

/**
 * useSearchFilter - filters an array by the global search query.
 *
 * @param data - Array of items to filter
 * @param getText - Function that extracts searchable text from each item
 * @returns Filtered array (case-insensitive substring match)
 */
export function useSearchFilter<T>(data: T[], getText: (item: T) => string): T[] {
  const { query } = useSearch();

  return useMemo(() => {
    if (!query.trim()) return data;
    const lower = query.toLowerCase();
    return data.filter((item) => getText(item).toLowerCase().includes(lower));
  }, [data, query, getText]);
}
