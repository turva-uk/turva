/**
 * A page's own sublink in the side bar, such as an organisation's name
 * under "Organisations" while that organisation's page is open.
 *
 * The side bar's fixed sublinks live in `navItems.ts`. This is for one
 * only the page knows, because its label comes from what the page loaded.
 * The page names it with `usePageSublink`, `NavSublinkProvider` holds it,
 * and `SideNav` shows it beneath its parent while the page is open.
 */

import { createContext, useContext, useEffect } from "react";

/** A link the open page asks the side bar to show beneath one of its links. */
export interface PageSublink {
  /** The side bar link it sits under, such as "/organisations" */
  parent: string;
  to: string;
  label: string;
}

export interface PageSublinkState {
  sublink: PageSublink | null;
  setSublink: (sublink: PageSublink | null) => void;
}

export const PageSublinkContext = createContext<PageSublinkState | null>(null);

/**
 * Show `sublink` in the side bar while the calling page is open, and take
 * it away when the page closes. Pass `null` while the page is still loading.
 */
export function usePageSublink(sublink: PageSublink | null): void {
  const setSublink = useContext(PageSublinkContext)?.setSublink;
  const parent = sublink?.parent;
  const to = sublink?.to;
  const label = sublink?.label;

  useEffect(() => {
    if (!setSublink || !parent || !to || !label) return;
    setSublink({ parent, to, label });

    return () => setSublink(null);
  }, [setSublink, parent, to, label]);
}

/** The open page's sublink, or `null` when it has none. */
export function useCurrentPageSublink(): PageSublink | null {
  return useContext(PageSublinkContext)?.sublink ?? null;
}
