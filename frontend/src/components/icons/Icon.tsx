/**
 * Icon Component
 *
 * Wrapper component for standardized icon sizing across the application.
 * Provides consistent sm/md/lg sizing for all Tabler icons.
 * Icons automatically scale down on mobile (below theme.breakpoints.sm).
 */

import type { ReactElement } from "react";
import { cloneElement } from "react";
import { ThemeIcon, useMantineTheme } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { IconProps as TablerIconProps } from "@tabler/icons-react";

/**
 * Icon size variants mapped to pixel values
 * Desktop (≥640px):
 * - sm: 20px (inputs, small buttons, inline text)
 * - md: 28px (default size, general UI elements)
 * - mlg: 36px (an icon that is the whole control, beside a heading)
 * - lg: 48px (action cards, prominent features)
 * - xl: 72px (hero sections, landing page features)
 *
 * Mobile (<640px):
 * - sm: 16px
 * - md: 20px
 * - mlg: 36px, unchanged: see below
 * - lg: 32px
 * - xl: 48px
 *
 * `mlg` exists for an icon that is the entire control rather than
 * decoration beside a label - the sort that sits in a page heading and
 * leads somewhere. It needs to be easy to press and easy to notice, so
 * `md` is too small, but it should not compete with the page's own
 * content, so `lg` is too big. Every such icon wants the same size,
 * which is why this is a named step rather than a measurement repeated
 * in each component.
 *
 * **It does not shrink on a phone.** The other steps get smaller there
 * to save room, but `mlg` is something to press, and a phone is where it
 * is pressed with a finger. At 28px the passport's inbox button was hard
 * to hit on an iPhone; at 36px, with the button's own padding, it is a
 * 44px target, the size Apple recommends for touch.
 */
export type IconSize = "sm" | "md" | "mlg" | "lg" | "xl";

interface IconProps {
  /** Icon element from @tabler/icons-react */
  icon: ReactElement;
  /** Size variant - defaults to md */
  size?: IconSize;
  /** Icon colour - any valid CSS colour value */
  colour?: string;
  /** Optional class name for additional styling */
  className?: string;
  /** Wrap the icon in a circular ThemeIcon container with this colour */
  container?: MantineColor;
  /** ThemeIcon variant when container is set (default: "light") */
  containerVariant?: "light" | "filled" | "outline";
  /**
   * Keep the wide-screen size at every width, rather than shrinking on
   * a phone. For an icon sitting inside a control whose own height does
   * not shrink, where a smaller icon looked like the control changing
   * as the window narrowed.
   */
  fixed?: boolean;
}

/** Desktop size map (≥640px) */
const desktopSizeMap: Record<IconSize, number> = {
  sm: 20,
  md: 28,
  mlg: 36,
  lg: 48,
  xl: 72,
};

/** Mobile size map (<640px) */
const mobileSizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  mlg: 36,
  lg: 32,
  xl: 48,
};

/**
 * Icon component that wraps Tabler icons with consistent sizing.
 * Automatically scales down on mobile devices.
 * Optionally wraps in a circular ThemeIcon container.
 *
 * @param props - Component props
 * @returns Cloned icon element with size applied
 *
 * @example
 * ```tsx
 * <Icon icon={<IconPencil />} size="sm" />
 * <Icon icon={<IconUserPlus />} size="lg" />
 * <Icon icon={<IconCheck />} container="var(--success-color)" />
 * <Icon icon={<IconX />} container="var(--alert-color)" containerVariant="filled" />
 * ```
 */
export default function Icon({
  icon,
  size = "md",
  colour,
  className,
  container,
  containerVariant = "light",
  fixed = false,
}: IconProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });

  // Use desktop sizes by default (when isMobile is undefined or false)
  const sizeMap = isMobile && !fixed ? mobileSizeMap : desktopSizeMap;
  const pixelSize = sizeMap[size];

  // Every icon in the app is a Tabler icon (see appIcons.ts), so it takes
  // Tabler's props. Said once here, on the element, rather than by
  // casting each props object handed to cloneElement.
  const tablerIcon = icon as ReactElement<TablerIconProps>;

  // Clone the icon element and pass size, colour and className props
  const clonedIcon = cloneElement(tablerIcon, {
    size: pixelSize,
    ...(colour ? { color: colour } : {}),
    className,
  });

  if (container) {
    const containerIconSize = Math.round(pixelSize * 1.3);
    const containerIcon = cloneElement(tablerIcon, {
      size: containerIconSize,
      stroke: 2.5,
      ...(colour ? { color: colour } : {}),
      className,
    });

    return (
      <ThemeIcon
        color={container}
        variant={containerVariant}
        size={pixelSize + 16}
        radius="50%"
      >
        {containerIcon}
      </ThemeIcon>
    );
  }

  return clonedIcon;
}
