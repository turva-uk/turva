/**
 * GuidanceNote Component
 *
 * Standing guidance a person should read, such as "Appointment is not
 * professional verification" on an organisation's page. A plain card
 * with a thin stripe in its status colour down the left edge, a small
 * icon, a bold title and the text in the page's own colours.
 *
 * It can carry one small outline button, for a nudge such as "check your
 * profile": the note says why, the button goes there. It stays an outline
 * button so the page's own main action keeps the filled one.
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
 *
 * <GuidanceNote
 *   icon={<IconUser />}
 *   title="Recorded in your name: Dr Anita Patel"
 *   description="Check your profile and CSO declaration are right."
 *   action={{ label: "Check your profile", to: "/settings/profile" }}
 * />
 * ```
 */

import type { ReactElement, ReactNode } from "react";
import { Box, Button, Group, Stack } from "@mantine/core";
import { Link } from "react-router";

import BaseCard from "@/components/base-card/BaseCard";
import Icon from "@/components/icons";
import { BodyTextBold, BodyTextInline } from "@/components/typography";
import { statusColours, type StatusColourName } from "@/styles/semanticColours";
import classes from "./GuidanceNote.module.css";

/** A link the note offers, drawn as a small outline button */
export interface GuidanceNoteAction {
  /** The button's words, such as "Check your profile" */
  label: string;
  /** Where the button goes, within the app */
  to: string;
}

export interface GuidanceNoteProps {
  /** Tabler icon element, drawn small in the status colour */
  icon: ReactElement;
  /** The guidance in a few words */
  title: string;
  /** The guidance itself */
  description: ReactNode;
  /** Status colour for the stripe and the icon (defaults to "info") */
  colour?: StatusColourName;
  /** An optional button beneath the text, for a nudge to go and check something */
  action?: GuidanceNoteAction;
}

export default function GuidanceNote({
  icon,
  title,
  description,
  colour = "info",
  action,
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
          {action && (
            <Box mt="xs">
              <Button component={Link} to={action.to} variant="outline" size="sm">
                {action.label}
              </Button>
            </Box>
          )}
        </Stack>
      </Group>
    </BaseCard>
  );
}
