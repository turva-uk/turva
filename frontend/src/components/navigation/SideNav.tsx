/**
 * SideNav Component
 *
 * The main navigation: Safety files, Settings and Organisations, with
 * Sign out at the foot. A sublink, such as "Your profile" under
 * "Settings", shows beneath its link only while its own page is open: the
 * link's page already offers it. A page can add its own with
 * `usePageSublink`, such as an organisation's name under "Organisations",
 * or a trail two deep, such as a safety file's name under "Safety files"
 * and "File team" under that. It sits on the left of every signed-in page
 * on a wide screen, and inside the navigation drawer on a narrow one.
 *
 * @example
 * ```tsx
 * <SideNav onSignOut={signOut} signingOut={false} onNavigate={closeDrawer} />
 * ```
 */

import { Stack } from "@mantine/core";
import { Fragment, type ReactNode } from "react";
import { useLocation } from "react-router";

import LogoutNavLink from "./LogoutNavLink";
import { isWithin, NAVIGATION, type NavChild } from "./navItems";
import { useCurrentPageSublinks } from "./pageSublink";
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
  const pageSublinks = useCurrentPageSublinks();

  /** Every sublink beneath `parent`: its fixed ones, then the page's own. */
  function beneath(parent: string, fixed: readonly NavChild[] = []): NavChild[] {
    return [...fixed, ...pageSublinks.filter((sublink) => sublink.parent === parent)];
  }

  /** The sublinks beneath `parent` that lead to the open page, each with its own beneath it. */
  function sublinksOf(parent: string, level: 1 | 2, fixed?: readonly NavChild[]): ReactNode {
    return beneath(parent, fixed)
      .filter((child) => isWithin(pathname, child.to))
      .map((child) => (
        <Fragment key={child.to}>
          <SideNavLink
            to={child.to}
            label={child.label}
            level={level}
            exact={beneath(child.to).length > 0}
            onNavigate={onNavigate}
          />
          {level === 1 && sublinksOf(child.to, 2)}
        </Fragment>
      ));
  }

  return (
    <Stack component="nav" aria-label="Main navigation" className={classes.nav} p="sm" gap="xs">
      <Stack gap={0} className={classes.list}>
        {NAVIGATION.map(({ to, label, icon, children }) => (
          <Fragment key={to}>
            <SideNavLink
              to={to}
              label={label}
              icon={icon}
              exact={beneath(to, children).length > 0}
              onNavigate={onNavigate}
            />
            {sublinksOf(to, 1, children)}
          </Fragment>
        ))}
      </Stack>

      <LogoutNavLink onSignOut={onSignOut} signingOut={signingOut} />
    </Stack>
  );
}
