/**
 * Divider Component
 *
 * Thin horizontal or vertical separator line. Wraps Mantine's Divider
 * with simplified props for consistent usage across the application.
 */

import { Divider as MantineDivider } from "@mantine/core";
import type { MantineSpacing } from "@mantine/core";

export interface DividerProps {
  /** Orientation - defaults to horizontal */
  orientation?: "horizontal" | "vertical";
  /** Vertical margin (Mantine spacing token) */
  my?: MantineSpacing;
  /** Top margin (Mantine spacing token) */
  mt?: MantineSpacing;
  /** Bottom margin (Mantine spacing token) */
  mb?: MantineSpacing;
}

export default function Divider({ orientation = "horizontal", my, mt, mb }: DividerProps) {
  return (
    <MantineDivider
      orientation={orientation}
      my={my}
      mt={mt}
      mb={mb}
      color="var(--card-border, var(--mantine-color-gray-3))"
    />
  );
}
