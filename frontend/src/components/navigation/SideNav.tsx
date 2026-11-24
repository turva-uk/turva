/**
 * SideNav Component
 *
 * The main navigation: Safety files, Settings and Organisations, with
 * Sign out at the foot. A sublink, such as "Your profile" under
 * "Settings", shows beneath its link only while its own page is open: the
 * link's page already offers it. A page can add one of its own, such as an
 * organisation's name under "Organisations", with `usePageSublink`. It sits on the left of every signed-in page on a
 * wide screen, and inside the navigation drawer on a narrow one.
 *
 * @example
 * ```tsx
 * <SideNav onSignOut={signOut} signingOut={false} onNavigate={closeDrawer} />
 * ```
 */

import { Stack } from "@mantine/core";
import { Fragment } from "react";
import { useLocation } from "react-router";

import LogoutNavLink from "./LogoutNavLink";
import { isWithin, NAVIGATION } from "./navItems";
import { useCurrentPageSublink } from "./pageSublink";
import SideNavLink from "./SideNavLink";
import classes from "./SideNav.module.css";

export interface SideNavProps {
  /** Called when "Sign out" is pressed */
  onSignOut: () => void;
  /** Signing out is under way */
  signingOut?: boolean;
  /** Called after a link is followed, such as to close the drawer */
  onNavigate?: () => void;
}

export default function SideNav({ onSignOut, signingOut = false, onNavigate }: SideNavProps) {
  const { pathname } = useLocation();
  const pageSublink = useCurrentPageSublink();

  return (
    <Stack component="nav" aria-label="Main navigation" className={classes.nav} p="sm" gap="xs">
      <Stack gap={0} className={classes.list}>
        {NAVIGATION.map(({ to, label, icon, children }) => {
          const sublinks = [
            ...(children ?? []),
            ...(pageSublink?.parent === to ? [pageSublink] : []),
          ];

          return (
            <Fragment key={to}>
              <SideNavLink
                to={to}
                label={label}
                icon={icon}
                exact={sublinks.length > 0}
                onNavigate={onNavigate}
              />
              {sublinks
                .filter((child) => isWithin(pathname, child.to))
                .map((child) => (
                  <SideNavLink
                    key={child.to}
                    to={child.to}
                    label={child.label}
                    nested
                    onNavigate={onNavigate}
                  />
                ))}
            </Fragment>
          );
        })}
      </Stack>

      <LogoutNavLink onSignOut={onSignOut} signingOut={signingOut} />
    </Stack>
  );
}
