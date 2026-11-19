/**
 * Search context definition.
 *
 * Separated from the provider component to satisfy
 * react-refresh/only-export-components.
 */

import { createContext } from "react";

export interface SearchContextValue {
  /** Current search query */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Whether the ribbon search field is visible */
  showSearch: boolean;
  /** Toggle ribbon search visibility (pages call this on mount/unmount) */
  setShowSearch: (show: boolean) => void;
}

export const SearchContext = createContext<SearchContextValue | undefined>(undefined);
