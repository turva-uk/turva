/**
 * LogoutNavLink Component
 *
 * "Sign out", at the foot of the side bar. It looks like the links above
 * it but is a button, since it changes something rather than going
 * somewhere. While signing out is under way it says so and cannot be
 * pressed again.
 *
 * @example
 * ```tsx
 * <LogoutNavLink onSignOut={signOut} signingOut={false} />
 * ```
 */

import { NavLink } from "@mantine/core";

import NavIcon from "@/components/icons/NavIcon";
import classes from "./SideNav.module.css";

export interface LogoutNavLinkProps {
  /** Called when "Sign out" is pressed */
  onSignOut: () => void;
  /** Signing out is under way */
  signingOut?: boolean;
}

export default function LogoutNavLink({ onSignOut, signingOut = false }: LogoutNavLinkProps) {
  return (
    <NavLink
      component="button"
      type="button"
      label={signingOut ? "Signing out…" : "Sign out"}
      leftSection={<NavIcon name="logout" />}
      // Mantine's `disabled` only marks the link; it does not stop a press.
      // `aria-disabled` says it is unavailable, and the handler ignores it.
      aria-disabled={signingOut || undefined}
      aria-busy={signingOut || undefined}
      onClick={signingOut ? undefined : onSignOut}
      classNames={{ root: classes.link, label: classes.label }}
    />
  );
}
