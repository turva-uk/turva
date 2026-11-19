/**
 * EmptyState Component
 *
 * Muted text for empty-state hints and placeholder labels. The theme's
 * `dimmed` colour rather than the input placeholder grey: this is content
 * a reader needs, so it must meet WCAG AA contrast, and `gray.4` on
 * white is 1.5:1.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Placeholder hint content */
  children: ReactNode;
}

/**
 * Renders hint text in `dimmed` at body size (19px).
 *
 * @param props - Component props
 * @returns Light grey text element
 */
export default function EmptyState({ children }: EmptyStateProps) {
  return (
    <Text size="md" c="dimmed">
      {children}
    </Text>
  );
}
