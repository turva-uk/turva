/**
 * BodyTextClamp Component
 *
 * Body text with line-clamping that truncates content with an ellipsis
 * after the specified number of lines. Useful for card previews and
 * list items where space is constrained.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { typographyTokens } from "@/theme";

interface BodyTextClampProps {
  /** Content to render */
  children: ReactNode;
  /** Maximum number of visible lines before truncation with ellipsis */
  lineClamp: number;
}

/**
 * Renders body text truncated to the specified number of lines.
 *
 * @param props - Component props
 * @returns Clamped text element
 */
export default function BodyTextClamp({ children, lineClamp }: BodyTextClampProps) {
  return (
    <Text size="md" fw={typographyTokens.fontWeights.body} lineClamp={lineClamp}>
      {children}
    </Text>
  );
}
