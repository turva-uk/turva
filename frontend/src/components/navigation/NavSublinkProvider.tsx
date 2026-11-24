/**
 * NavSublinkProvider Component
 *
 * Holds the open page's own side bar sublink, so a page and the side bar
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
  const [sublink, setSublink] = useState<PageSublink | null>(null);
  const value = useMemo(() => ({ sublink, setSublink }), [sublink]);

  return <PageSublinkContext.Provider value={value}>{children}</PageSublinkContext.Provider>;
}
