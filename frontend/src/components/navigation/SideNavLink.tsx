/**
 * SideNavLink Component
 *
 * One link in the side bar. It is marked as the current page on its own
 * address and on every page beneath it, so "Safety files" stays marked
 * while somebody reads a hazard in one.
 *
 * @example
 * ```tsx
 * <SideNavLink to="/safety-files" label="Safety files" onNavigate={closeDrawer} />
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
  /** The icon beside the words */
  icon: IconName;
  /** Called after the link is followed, such as to close the drawer */
  onNavigate?: () => void;
}

export default function SideNavLink({ to, label, icon, onNavigate }: SideNavLinkProps) {
  const { pathname } = useLocation();
  const active = isWithin(pathname, to);

  return (
    <NavLink
      component={Link}
      to={to}
      label={label}
      leftSection={<NavIcon name={icon} />}
      active={active}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      classNames={{ root: classes.link, label: classes.label }}
    />
  );
}
