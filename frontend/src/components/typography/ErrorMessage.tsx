/**
 * ErrorMessage Component
 *
 * Validation and error message text with an alert icon.
 * Uses `--error-color`, an orange-red, for colour-blind accessibility
 * (avoids red/green ambiguity).
 */

import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { IconAlertCircle } from "@/components/icons/appIcons";
import { typographyTokens } from "@/theme";
import classes from "./ErrorMessage.module.css";

export interface ErrorMessageProps {
  /** Error message content */
  children: ReactNode;
}

/**
 * Renders an error message with an alert circle icon in `--error-color`.
 *
 * @param props - Component props
 * @returns Inline group with icon and bold error text
 */
export default function ErrorMessage({ children }: ErrorMessageProps) {
  return (
    <Group gap={6} align="center" wrap="nowrap">
      <Box className={classes.icon}>
        <IconAlertCircle size="100%" color="var(--error-color)" />
      </Box>
      <Text size="md" c="var(--error-color)" fw={typographyTokens.fontWeights.bold}>
        {children}
      </Text>
    </Group>
  );
}
