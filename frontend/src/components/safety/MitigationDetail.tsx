/**
 * MitigationDetail Component
 *
 * One mitigation in full: its status, control type and responsible
 * person; its implementation and verification evidence; its recorded
 * narrative; and the hazards it addresses. It says plainly that a
 * mitigation's status and links never change a hazard's assessment, and
 * that a recorded verification is the author's judgement.
 *
 * The narrative is shown as the Markdown source that was saved, not
 * rendered, as `HazardDetail` shows a hazard's: `SAFETY.md` records that
 * the shared Markdown display is not yet used by the application's pages.
 *
 * @example
 * ```tsx
 * <MitigationDetail
 *   mitigation={detail.mitigation}
 *   hazards={detail.hazards}
 *   hazardHref={(id) => `/safety-files/${slug}/hazards/${id}`}
 * />
 * ```
 */

import { Box, List, Stack } from "@mantine/core";

import FormattedDate from "@/components/data/Date";
import { IconAlertCircle } from "@/components/icons/appIcons";
import { StateMessage } from "@/components/message-cards";
import { BodyText, BodyTextBold, Heading, TextLink } from "@/components/typography";
import type { Hazard, Mitigation } from "@/lib/safety";

import classes from "./recordedSource.module.css";

export interface MitigationDetailProps {
  mitigation: Mitigation;
  /** The file's hazards, so the ones this mitigation names can be shown */
  hazards: Hazard[];
  /** Show the mitigation's reference and title as a heading. Off where the page header shows them. */
  showTitle?: boolean;
  /** Where each linked hazard's page is, so its title links there */
  hazardHref?: (hazardId: string) => string;
}

export default function MitigationDetail({
  mitigation,
  hazards,
  showTitle = true,
  hazardHref,
}: MitigationDetailProps) {
  const linked = mitigation.hazards.map((id) => ({
    id,
    hazard: hazards.find((hazard) => hazard.id === id),
  }));
  const missing = linked.filter(({ hazard }) => !hazard).map(({ id }) => id);

  return (
    <Stack gap="lg">
      {showTitle && (
        <Heading>
          {mitigation.id}: {mitigation.title}
        </Heading>
      )}
      <Stack gap={4}>
        <BodyText>
          Status: {mitigation.status || "Not recorded"}. Control type:{" "}
          {mitigation.control_type || "Not recorded"}. Responsible person:{" "}
          {mitigation.owner || "Not recorded"}.
        </BodyText>
        <BodyText>
          Created <FormattedDate date={mitigation.created} format="medium" />; updated{" "}
          <FormattedDate date={mitigation.updated} format="medium" />.
        </BodyText>
      </Stack>

      <Stack gap="xs">
        <Heading>Implementation and verification evidence</Heading>
        <BodyText preserveLines>
          {mitigation.evidence.trim()
            ? mitigation.evidence
            : "No implementation evidence recorded. A proposed control is not evidence of risk reduction."}
        </BodyText>
      </Stack>

      {mitigation.body.trim() && (
        <Stack gap="xs">
          <Heading>Recorded narrative (Markdown)</Heading>
          <Box component="pre" className={classes.source}>
            {mitigation.body}
          </Box>
        </Stack>
      )}

      <Stack gap="xs">
        <Heading>Linked hazards</Heading>
        {linked.length === 0 ? (
          <BodyText c="dimmed">No linked hazards recorded.</BodyText>
        ) : (
          <List spacing="xs">
            {linked.map(({ id, hazard }) =>
              hazard ? (
                <List.Item key={id}>
                  {hazardHref ? (
                    <TextLink to={hazardHref(id)}>
                      {id}: {hazard.title}
                    </TextLink>
                  ) : (
                    <BodyTextBold>
                      {id}: {hazard.title}
                    </BodyTextBold>
                  )}
                </List.Item>
              ) : null,
            )}
          </List>
        )}
        {missing.length > 0 && (
          <Box role="alert">
            <StateMessage
              icon={<IconAlertCircle />}
              colour="alert"
              title="Linked hazard unavailable"
              description={`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} recorded against this mitigation, but ${missing.length === 1 ? "its" : "their"} details were not supplied. The hazard links are incomplete in this view.`}
            />
          </Box>
        )}
        <BodyText c="dimmed">
          Mitigation status and links never change a risk assessment automatically. Verification
          is recorded judgement, not certification by Turva.
        </BodyText>
      </Stack>
    </Stack>
  );
}
