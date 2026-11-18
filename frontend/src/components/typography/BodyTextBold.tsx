/**
 * BodyTextBold Component
 *
 * Bold variant of body text for emphasis, labels, and key values.
 * Uses `fw={700}` with optional text alignment.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { typographyTokens } from "@/theme";

export interface BodyTextBoldProps {
  /** Content to render in bold */
  children: ReactNode;
  /** Text alignment. Defaults to "left". */
  justify?: "left" | "centre" | "right";
}

const alignMap = {
  left: "left",
  centre: "center",
  right: "right",
} as const;

/**
 * Renders bold body text with optional alignment.
 *
 * @param props - Component props
 * @returns Bold text element
 */
export default function BodyTextBold({ children, justify = "left" }: BodyTextBoldProps) {
  return (
    <Text size="md" fw={typographyTokens.fontWeights.bold} ta={alignMap[justify]}>
      {children}
    </Text>
  );
}
