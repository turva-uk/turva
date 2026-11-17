/**
 * BurgerButton Component
 *
 * Hamburger menu toggle for opening/closing the mobile navigation drawer.
 * Renders an accessible ActionIcon with aria-controls and aria-expanded.
 * 34px, or 44px below the sm breakpoint for a finger; the icon is a
 * fixed 32px either way.
 */

import { ActionIcon, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMenu2 } from "@/components/icons/appIcons";

interface BurgerButtonProps {
  /** Whether the navigation is currently open */
  navOpen: boolean;
  /** Callback when the button is clicked */
  onClick: () => void;
  /** Stroke width of the menu icon (default: 2.5) */
  stroke?: number;
}

export default function BurgerButton({ navOpen, onClick, stroke = 2.5 }: BurgerButtonProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });
  return (
    <ActionIcon
      variant="subtle"
      size={isMobile ? 44 : "lg"}
      onClick={onClick}
      aria-controls="app-navbar"
      aria-label={navOpen ? "Close navigation" : "Open navigation"}
      aria-expanded={navOpen}
      // The theme's secondary 5 as a variable, not a value read when this
      // file loads, so the icon follows the brand of the theme around it.
      style={{
        color: "var(--mantine-color-secondary-5)",
        "--ai-hover": "var(--burger-hover-bg)",
        "--ai-hover-color": "var(--mantine-color-secondary-5)",
      }}
    >
      <IconMenu2 size={32} stroke={stroke} />
    </ActionIcon>
  );
}
