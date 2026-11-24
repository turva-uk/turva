/**
 * SideNav Component
 *
 * The main navigation: Safety files, Your profile and Organisations, with
 * Sign out at the foot. It sits on the left of every signed-in page on a
 * wide screen, and inside the navigation drawer on a narrow one.
 *
 * @example
 * ```tsx
 * <SideNav onSignOut={signOut} signingOut={false} onNavigate={closeDrawer} />
 * ```
 */

import { Stack } from "@mantine/core";

import LogoutNavLink from "./LogoutNavLink";
import { NAVIGATION } from "./navItems";
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
  return (
    <Stack component="nav" aria-label="Main navigation" className={classes.nav} p="sm" gap="xs">
      <Stack gap={0} className={classes.list}>
        {NAVIGATION.map(({ to, label, icon }) => (
          <SideNavLink key={to} to={to} label={label} icon={icon} onNavigate={onNavigate} />
        ))}
      </Stack>

      <LogoutNavLink onSignOut={onSignOut} signingOut={signingOut} />
    </Stack>
  );
}
