/**
 * A page's own sublinks in the side bar, such as an organisation's name
 * under "Organisations" while that organisation's page is open.
 *
 * The side bar's fixed sublinks live in `navItems.ts`. These are for the
 * ones only the page knows, because their labels come from what the page
 * loaded. The page names them with `usePageSublink`, `NavSublinkProvider`
 * holds them, and `SideNav` shows each beneath its parent while the page
 * is open.
 *
 * A page deeper in can name a trail, each sublink beneath the one before:
 * a file team page names its safety file under "Safety files", then
 * "File team" under the file.
 */

import { createContext, useContext, useEffect } from "react";

/** A link the open page asks the side bar to show beneath one of its links. */
export interface PageSublink {
  /** The link it sits under, such as "/organisations", or another page sublink's `to` */
  parent: string;
  to: string;
  label: string;
}

export interface PageSublinkState {
  sublinks: readonly PageSublink[];
  setSublinks: (sublinks: readonly PageSublink[]) => void;
}

// Separators no address or label holds, to compare a trail by its contents.
const FIELD = "\u0000";
const LINK = "\u0001";

const NONE: readonly PageSublink[] = [];

export const PageSublinkContext = createContext<PageSublinkState | null>(null);

/**
 * Show `sublink` in the side bar while the calling page is open, and take
 * it away when the page closes. Pass a trail, outermost first, for a page
 * beneath another page's sublink, and `null` while the page is still
 * loading.
 */
export function usePageSublink(sublink: PageSublink | readonly PageSublink[] | null): void {
  const setSublinks = useContext(PageSublinkContext)?.setSublinks;
  const trail = sublink === null ? [] : "parent" in sublink ? [sublink] : sublink;
  // The trail is compared by its contents, so a page that builds a new
  // array on every render does not set it again each time.
  const key = trail.map(({ parent, to, label }) => [parent, to, label].join(FIELD)).join(LINK);

  useEffect(() => {
    if (!setSublinks || key === "") return;
    setSublinks(
      key.split(LINK).map((link) => {
        const [parent = "", to = "", label = ""] = link.split(FIELD);

        return { parent, to, label };
      }),
    );

    return () => setSublinks([]);
  }, [setSublinks, key]);
}

/** The open page's sublinks, empty when it has none. */
export function useCurrentPageSublinks(): readonly PageSublink[] {
  return useContext(PageSublinkContext)?.sublinks ?? NONE;
}
