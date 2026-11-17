/**
 * AppTooltip Component
 *
 * Design-system tooltip wrapper around Mantine's Tooltip.
 * Enforces consistent styling: light secondary background with
 * primary navy text using BodyTextInline typography.
 *
 * On mobile, enables touch events and stops event propagation
 * so tooltips work correctly in tappable containers.
 */

import type { ReactElement, ReactNode } from "react";
import {
  Tooltip,
  useComputedColorScheme,
  useMantineTheme,
  type FloatingPosition,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import BodyTextInline from "@/components/typography/BodyTextInline";

export interface AppTooltipProps {
  /** Content to wrap - the tooltip target */
  children: ReactElement;
  /** Text to display in the tooltip */
  label: ReactNode;
  /** Delay before opening (ms). Default: 400 */
  openDelay?: number;
  /**
   * Which side of the target the tooltip opens on. Default: "top".
   * The icons above a table use "bottom", so the hint sits over the
   * table rather than over the page title.
   */
  position?: FloatingPosition;
}

/**
 * Renders a styled tooltip with light grey background and primary text.
 * Automatically adapts for mobile (touch-friendly).
 */
export default function AppTooltip({
  children,
  label,
  openDelay = 400,
  position = "top",
}: AppTooltipProps) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const tooltipColour = colorScheme === "dark" ? "gray.6" : "gray.1";
  const textColour = colorScheme === "dark" ? "primary.8" : "primary";
  const tooltipLabel = <BodyTextInline c={textColour}>{label}</BodyTextInline>;

  if (isMobile) {
    return (
      // Not an interaction of its own: stops a tap that opens the tooltip
      // from also triggering a clickable parent. Keyboard focus shows the
      // tooltip without a click, so there is no key event to mirror.
      <span onClick={(e) => e.stopPropagation()}>
        <Tooltip
          label={tooltipLabel}
          openDelay={openDelay}
          color={tooltipColour}
          position={position}
          events={{ hover: true, focus: true, touch: true }}
        >
          {children}
        </Tooltip>
      </span>
    );
  }

  return (
    <Tooltip
      label={tooltipLabel}
      openDelay={openDelay}
      color={tooltipColour}
      position={position}
    >
      {children}
    </Tooltip>
  );
}
