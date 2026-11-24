/**
 * NavSublinkProvider Component
 *
 * Holds the open page's own side bar sublinks, so a page and the side bar
 * beside it can share it. `MainLayout` wraps the page and the side bar in
 * it; see `pageSublink.ts`.
 *
 * @example
 * ```tsx
 * <NavSublinkProvider>
 *   <SideNav onSignOut={signOut} />
 *   <OrganisationPage />
 * </NavSublinkProvider>
 * ```
 */

import { useMemo, useState, type ReactNode } from "react";

import { PageSublinkContext, type PageSublink } from "./pageSublink";

export interface NavSublinkProviderProps {
  children: ReactNode;
}

export default function NavSublinkProvider({ children }: NavSublinkProviderProps) {
  const [sublinks, setSublinks] = useState<readonly PageSublink[]>([]);
  const value = useMemo(() => ({ sublinks, setSublinks }), [sublinks]);

  return <PageSublinkContext.Provider value={value}>{children}</PageSublinkContext.Provider>;
}
