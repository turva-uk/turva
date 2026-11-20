/**
 * EllipsisMenu Component
 *
 * A three-dot action menu that opens a dropdown of menu items.
 * Wraps Mantine's Menu with consistent styling and the design system's
 * IconButton trigger. Use for row-level actions in tables and cards.
 * The trigger is 30px on desktop, where table rows stay compact, and 44px
 * below the sm breakpoint for a finger, as is each item in the dropdown.
 */

import type { ReactElement } from "react";
import { ActionIcon, Menu, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconDots } from "@/components/icons/appIcons";
import Icon from "@/components/icons";
import { statusColours } from "@/styles/semanticColours";
import classes from "./EllipsisMenu.module.css";

export interface EllipsisMenuItem {
  /** Display label for the menu item */
  label: string;
  /** Icon element to show before the label */
  icon?: ReactElement;
  /** CSS text colour. Known status-fill tokens resolve to their readable foreground. */
  color?: string;
  /** Click handler */
  onClick: () => void;
}

export interface EllipsisMenuProps {
  /** Menu items to display */
  items: EllipsisMenuItem[];
  /** Accessible label for the trigger button */
  "aria-label": string;
}

export default function EllipsisMenu({ items, "aria-label": ariaLabel }: EllipsisMenuProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });
  if (items.length === 0) return null;

  return (
    <Menu position="bottom-end" shadow="md" withInitialFocusPlaceholder={false}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          size={isMobile ? 44 : 30}
          className={classes.trigger}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={ariaLabel}
        >
          <Icon icon={<IconDots />} size={isMobile ? "md" : "sm"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item, index) => {
          // Older callers supply a status fill as the text colour. Use the
          // palette's foreground token; arbitrary CSS colours remain explicit.
          const foreground =
            Object.values(statusColours).find((status) => status.bg === item.color)?.fg ??
            item.color;
          return (
            <Menu.Item
              key={item.label}
              className={classes.touchItem}
              color={foreground}
              style={foreground ? { color: foreground } : undefined}
              data-autofocus={index === 0 || undefined}
              leftSection={item.icon ? <Icon icon={item.icon} size="md" /> : undefined}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
            >
              {item.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
