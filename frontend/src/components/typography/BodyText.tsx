/**
 * BodyText Component
 *
 * Primary body text component for the application. Renders block-level
 * text at `md` size (19px) with standard body weight (500).
 * Inherits the theme text colour (navy) via `--mantine-color-text`.
 *
 * Line breaks collapse into spaces, as in any paragraph. Set
 * `preserveLines` for text somebody typed into a text area, so the lines
 * they wrote stay the lines that are read. Such text may also hold a
 * word longer than the line, a pasted address above all, so it is allowed
 * to break inside one where it would otherwise run off a phone.
 */

import { Text } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import type { ReactNode } from "react";
import { typographyTokens } from "@/theme";

export interface BodyTextProps {
  /** Content to render as body text */
  children: ReactNode;
  /** Optional colour override */
  c?: MantineColor;
  /** Text alignment. Defaults to "left". */
  justify?: "left" | "centre" | "right";
  /** Keep the line breaks in the text, for something typed in a text area */
  preserveLines?: boolean;
}

const alignMap = {
  left: "left",
  centre: "center",
  right: "right",
} as const;

/**
 * Renders block-level body text with consistent size and weight.
 *
 * @param props - Component props
 * @returns Text element
 */
export default function BodyText({
  children,
  c,
  justify = "left",
  preserveLines = false,
}: BodyTextProps) {
  return (
    <Text
      size="md"
      fw={typographyTokens.fontWeights.body}
      c={c}
      ta={alignMap[justify]}
      style={preserveLines ? { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } : undefined}
    >
      {children}
    </Text>
  );
}
