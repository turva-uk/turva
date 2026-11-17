/**
 * IconButton Component
 *
 * Wrapper around Mantine's ActionIcon that automatically sizes the container
 * to match the Icon component's md size.
 * Provides consistent icon button sizing across the application: 42px
 * square, or 48px below the sm breakpoint so it clears the 44px touch
 * target (WCAG 2.5.5, NHS) and matches the md button's phone height.
 * The icon keeps the same share of the button at both widths: md (28px)
 * on desktop, lg on a phone, where Icon shrinks every size and lg is
 * 32px. md there would be 20px, lost in the larger button.
 */

import { forwardRef, type MouseEventHandler, type ReactElement } from "react";
import { ActionIcon, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { MantineColor } from "@mantine/core";
import Icon from "@/components/icons";

interface IconButtonProps {
  /** Icon element from @tabler/icons-react */
  icon: ReactElement;
  /** Mantine variant */
  variant?:
    | "filled"
    | "light"
    | "outline"
    | "subtle"
    | "transparent"
    | "default"
    | "white"
    | "gradient";
  /** Color from Mantine theme */
  color?: MantineColor;
  /** Click handler */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * What the button does, read out by screen readers. Required: the
   * button shows only an icon, so without it a screen reader announces
   * just "button" (WCAG 4.1.2).
   */
  "aria-label": string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * IconButton component that wraps ActionIcon with automatic sizing.
 *
 * Forwards its ref, so a tooltip or popover can wrap it: both attach
 * to the element the ref lands on.
 *
 * @param props - Component props
 * @returns ActionIcon with Icon inside
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<IconPencil />}
 *   variant="subtle"
 *   color="primary"
 *   onClick={handleClick}
 *   aria-label="Edit"
 * />
 * ```
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, ...actionIconProps },
  ref,
) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });

  return (
    <ActionIcon ref={ref} {...actionIconProps} size={isMobile ? 48 : 42}>
      <Icon icon={icon} size={isMobile ? "lg" : "md"} />
    </ActionIcon>
  );
});

export default IconButton;
