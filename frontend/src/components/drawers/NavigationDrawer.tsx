/**
 * NavigationDrawer Component
 *
 * The side bar on a narrow screen: it slides in from the left when the
 * burger button is pressed, and closes when a link is followed, when
 * Escape is pressed, or when somebody taps outside it.
 *
 * @example
 * ```tsx
 * <NavigationDrawer opened={opened} onClose={close}>
 *   <SideNav onSignOut={signOut} onNavigate={close} />
 * </NavigationDrawer>
 * ```
 */

import { Drawer } from "@mantine/core";
import type { ReactNode } from "react";

import { LAYOUT_SIDEBAR_WIDTH } from "@/components/layouts/layoutConstants";
import classes from "./NavigationDrawer.module.css";

export interface NavigationDrawerProps {
  /** Whether the drawer is open */
  opened: boolean;
  /** Called to close it */
  onClose: () => void;
  /** What the drawer holds: the side bar */
  children: ReactNode;
}

export default function NavigationDrawer({ opened, onClose, children }: NavigationDrawerProps) {
  return (
    <Drawer
      id="app-navbar"
      opened={opened}
      onClose={onClose}
      position="left"
      size={LAYOUT_SIDEBAR_WIDTH}
      classNames={{ content: classes.content, body: classes.body }}
      title="Menu"
      closeButtonProps={{ "aria-label": "Close navigation" }}
    >
      {children}
    </Drawer>
  );
}
