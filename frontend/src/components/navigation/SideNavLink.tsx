/**
 * SideNavLink Component
 *
 * One link in the side bar. It is marked as the current page on its own
 * address and on every page beneath it, so "Safety files" stays marked
 * while somebody reads a hazard in one. With `exact`, it is marked on its
 * own address only, as a link with links beneath it is: on one of those
 * pages, that link is marked instead.
 *
 * A link at `level` 1 sits beneath another, such as "Your profile" under
 * "Settings": indented, with no icon. One at level 2 sits beneath that,
 * such as "File team" under a safety file's name, indented once more.
 *
 * @example
 * ```tsx
 * <SideNavLink to="/safety-files" label="Safety files" icon="safety" onNavigate={closeDrawer} />
 * <SideNavLink to="/settings/profile" label="Your profile" level={1} />
 * ```
 */

import { NavLink } from "@mantine/core";
import { Link, useLocation } from "react-router";

import NavIcon from "@/components/icons/NavIcon";
import type { IconName } from "@/components/icons/NavIcon";
import { isWithin } from "./navItems";
import classes from "./SideNav.module.css";

export interface SideNavLinkProps {
  /** Where the link goes */
  to: string;
  /** The link's words */
  label: string;
  /** The icon beside the words, left out on a link beneath another */
  icon?: IconName;
  /** How far beneath a top link it sits: 0 for a top link, then indented, with no icon */
  level?: 0 | 1 | 2;
  /** Marked as current on its own address only, not on pages beneath it */
  exact?: boolean;
  /** Called after the link is followed, such as to close the drawer */
  onNavigate?: () => void;
}

export default function SideNavLink({
  to,
  label,
  icon,
  level = 0,
  exact = false,
  onNavigate,
}: SideNavLinkProps) {
  const { pathname } = useLocation();
  const active = exact ? pathname === to : isWithin(pathname, to);
  const indent = [undefined, classes.nested, `${classes.nested} ${classes.nestedTwice}`][level];

  return (
    <NavLink
      component={Link}
      to={to}
      label={label}
      leftSection={icon && level === 0 ? <NavIcon name={icon} /> : undefined}
      active={active}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      classNames={{
        root: indent ? `${classes.link} ${indent}` : classes.link,
        label: classes.label,
      }}
    />
  );
}
