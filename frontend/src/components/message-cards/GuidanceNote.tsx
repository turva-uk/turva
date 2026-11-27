/**
 * GuidanceNote Component
 *
 * Standing guidance a person should read, such as "Appointment is not
 * professional verification" on an organisation's page. A plain card
 * with a thin stripe in its status colour down the left edge, a small
 * icon, a bold title and the text in the page's own colours.
 *
 * Quieter than `StateMessage` on purpose. `StateMessage` fills the card
 * with colour, which says something has gone wrong; use it for an error,
 * a failed save or an empty state. Use this for guidance that is always
 * there, so the page does not open looking like a warning.
 *
 * @example
 * ```tsx
 * <GuidanceNote
 *   icon={<IconAlertTriangle />}
 *   colour="warning"
 *   title="Appointment is not professional verification"
 *   description="Check competence through your organisation's own governance."
 * />
 * ```
 */

import type { ReactElement, ReactNode } from "react";
import { Box, Group, Stack } from "@mantine/core";

import BaseCard from "@/components/base-card/BaseCard";
import Icon from "@/components/icons";
import { BodyTextBold, BodyTextInline } from "@/components/typography";
import { statusColours, type StatusColourName } from "@/styles/semanticColours";
import classes from "./GuidanceNote.module.css";

export interface GuidanceNoteProps {
  /** Tabler icon element, drawn small in the status colour */
  icon: ReactElement;
  /** The guidance in a few words */
  title: string;
  /** The guidance itself */
  description: ReactNode;
  /** Status colour for the stripe and the icon (defaults to "info") */
  colour?: StatusColourName;
}

export default function GuidanceNote({
  icon,
  title,
  description,
  colour = "info",
}: GuidanceNoteProps) {
  const stripe = statusColours[colour].bg;

  return (
    <BaseCard
      className={classes.note}
      __vars={{ "--guidance-note-stripe": stripe }}
      data-testid="guidance-note"
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Box className={classes.icon} c={stripe} data-testid="guidance-note-icon">
          <Icon icon={icon} size="md" />
        </Box>
        <Stack gap={4}>
          <BodyTextBold>{title}</BodyTextBold>
          <BodyTextInline>{description}</BodyTextInline>
        </Stack>
      </Group>
    </BaseCard>
  );
}
