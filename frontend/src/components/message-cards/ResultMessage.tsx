/**
 * ResultMessage Component
 *
 * A full-width coloured card for displaying pass/fail or success/error
 * outcomes. Uses BaseCard with a background colour - border is
 * automatically removed, text set to white.
 */

import { Box, Group, Stack } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@/components/icons/appIcons";
import Icon from "@/components/icons";
import { badgeColours } from "@/components/badge/badgeColours";
import BaseCard from "@/components/base-card/BaseCard";
import { BodyTextInline, Heading } from "@/components/typography";

type ResultMessageVariant = "success" | "fail" | "warning";

interface ResultMessageProps {
  /** Visual variant controlling colour and icon */
  variant: ResultMessageVariant;
  /** Bold title text displayed in the card header */
  title: string;
  /** Optional subtitle shown beside the title */
  subtitle?: string;
}

const variantConfig: Record<ResultMessageVariant, { bg: string; icon: React.ReactElement }> = {
  success: { bg: badgeColours.success.bg, icon: <IconCheck /> },
  fail: { bg: badgeColours.alert.bg, icon: <IconX /> },
  warning: { bg: badgeColours.warning.bg, icon: <IconAlertTriangle /> },
};

export default function ResultMessage({ variant, title, subtitle }: ResultMessageProps) {
  const { bg, icon } = variantConfig[variant];

  return (
    <BaseCard bg={bg} data-testid="result-message">
      <Group gap="md" wrap="nowrap" align="center">
        <Box style={{ flexShrink: 0 }}>
          <Icon icon={icon} size="lg" />
        </Box>
        <Stack gap={4}>
          <Heading c="white">{title}</Heading>
          {subtitle && <BodyTextInline c="white">{subtitle}</BodyTextInline>}
        </Stack>
      </Group>
    </BaseCard>
  );
}
