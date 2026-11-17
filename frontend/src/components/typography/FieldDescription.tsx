/**
 * FieldDescription Component
 *
 * Secondary description text for form fields. Renders at body text size
 * and weight in the theme's `dimmed` colour to indicate supplementary
 * information below field labels.
 */

import { Text } from "@mantine/core";
import type { ReactNode } from "react";
import { typographyTokens } from "@/theme";

export interface FieldDescriptionProps {
  /** Description content */
  children: ReactNode;
}

export default function FieldDescription({ children }: FieldDescriptionProps) {
  return (
    <Text size="md" fw={typographyTokens.fontWeights.body} c="dimmed">
      {children}
    </Text>
  );
}
