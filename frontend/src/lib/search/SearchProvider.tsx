/**
 * SearchProvider Component
 *
 * Provides global search state for the ribbon SearchField.
 * Query is cleared on route navigation to prevent stale state.
 */

import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { SearchContext } from "./searchContext";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();

  // Track previous pathname in state (React-recommended pattern for
  // adjusting state during render without refs or effects)
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    if (query !== "") {
      setQuery("");
    }
    if (showSearch) {
      setShowSearch(false);
    }
  }

  const value = useMemo(
    () => ({ query, setQuery, showSearch, setShowSearch }),
    [query, showSearch],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
