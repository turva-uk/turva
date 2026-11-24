/**
 * HazardDetail Component
 *
 * One hazard in full: its cause, effect and harm; its risk before and
 * after mitigation, each with the severity and likelihood and the level
 * the server derived from them; the mitigations it relies on; the
 * justification for its residual risk; and its own notes. A hazard whose
 * residual level blocks go-live says so at the top.
 *
 * The score's words, such as "4 - Major", come from `hazard-options/`
 * when `options` is given; without it, the score is shown as its number.
 *
 * The recorded narratives, the hazard's and each mitigation's, are shown
 * as the Markdown source that was saved, not rendered: the evidence reads
 * exactly as committed. Rendering them is a separate decision, since
 * `SAFETY.md` records that the shared Markdown display is not yet used by
 * the application's pages.
 */

import { Box, SimpleGrid, Stack } from "@mantine/core";
import type { ReactNode } from "react";

import BaseCard from "@/components/base-card/BaseCard";
import FormattedDate from "@/components/data/Date";
import { IconAlertCircle } from "@/components/icons/appIcons";
import { ResultMessage, StateMessage } from "@/components/message-cards";
import { BodyText, BodyTextBold, Heading, TextLink } from "@/components/typography";
import type { Assessment, Hazard, HazardOptions, Mitigation } from "@/lib/safety";

import classes from "./recordedSource.module.css";
import RiskScoreBadge from "./RiskScoreBadge";

/** "Severity: 4 - Major", or "Severity: 4" with no options to name it. */
function scoreLine(
  name: string,
  score: number,
  choices: { value: string; label: string }[] | undefined,
): string {
  const label = choices?.find((choice) => choice.value === String(score))?.label;

  return `${name}: ${label ?? score}`;
}

function AssessmentCard({
  title,
  assessment,
  options,
}: {
  title: string;
  assessment: Assessment;
  options: HazardOptions | undefined;
}) {
  return (
    <BaseCard>
      <Stack gap="xs">
        <BodyTextBold>{title}</BodyTextBold>
        <RiskScoreBadge assessment={assessment} />
        <BodyText>{scoreLine("Severity", assessment.severity, options?.severity)}</BodyText>
        <BodyText>
          {scoreLine("Likelihood", assessment.likelihood, options?.likelihood)}
        </BodyText>
      </Stack>
    </BaseCard>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <Stack gap={4}>
      <BodyTextBold>{label}</BodyTextBold>
      <BodyText preserveLines>{text.trim() ? text : "Not recorded."}</BodyText>
    </Stack>
  );
}

export interface HazardDetailProps {
  hazard: Hazard;
  /** The file's mitigations, so the ones this hazard names can be shown */
  mitigations: Mitigation[];
  /** What `hazard-options/` serves, to put words to each score */
  options?: HazardOptions;
  /** Show the hazard's reference and title as a heading. Off where the page header shows them. */
  showTitle?: boolean;
  /** Where each linked mitigation's page is, so its title links there */
  mitigationHref?: (mitigationId: string) => string;
  /** Shown under the "Linked mitigations" heading, such as a button to record one */
  mitigationAction?: ReactNode;
}

/** The recorded Markdown, as it was saved. */
function Source({ text }: { text: string }) {
  return (
    <Box component="pre" className={classes.source}>
      {text}
    </Box>
  );
}

export default function HazardDetail({
  hazard,
  mitigations,
  options,
  showTitle = true,
  mitigationHref,
  mitigationAction,
}: HazardDetailProps) {
  const named = hazard.mitigations.map((id) => ({
    id,
    mitigation: mitigations.find((m) => m.id === id),
  }));

  return (
    <Stack gap="lg">
      {showTitle && (
        <Heading>
          {hazard.id}: {hazard.title}
        </Heading>
      )}
      <BodyText>
        Status: {hazard.status || "Not recorded"}. Responsible person:{" "}
        {hazard.owner || "Not recorded"}.
      </BodyText>
      <BodyText>
        Created <FormattedDate date={hazard.created} format="medium" />; updated{" "}
        <FormattedDate date={hazard.updated} format="medium" />.
      </BodyText>
      {hazard.requires_elimination && (
        <ResultMessage
          variant="warning"
          title="Residual risk requires elimination"
          subtitle={`The derived residual risk level is ${hazard.residual.risk_level}. A closed or transferred status does not by itself reduce that assessment.`}
        />
      )}
      <Field label="Cause" text={hazard.cause} />
      <Field label="Effect on the care pathway" text={hazard.effect} />
      <Field label="Potential harm" text={hazard.harm} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <AssessmentCard title="Initial risk" assessment={hazard.initial} options={options} />
        <AssessmentCard title="Residual risk" assessment={hazard.residual} options={options} />
      </SimpleGrid>
      <Stack gap="xs">
        <Heading>Linked mitigations</Heading>
        {mitigationAction}
        {named.length === 0 ? (
          <BodyText c="dimmed">No linked mitigations recorded.</BodyText>
        ) : (
          named.map(({ id, mitigation }) =>
            mitigation ? (
              <Stack
                component="section"
                role="region"
                aria-label={`${id}: ${mitigation.title}`}
                key={id}
                gap={4}
              >
                {mitigationHref ? (
                  <TextLink to={mitigationHref(id)}>
                    {id}: {mitigation.title}
                  </TextLink>
                ) : (
                  <BodyTextBold>
                    {id}: {mitigation.title}
                  </BodyTextBold>
                )}
                <BodyText>
                  {mitigation.control_type} control, {mitigation.status}
                </BodyText>
                <BodyText>Responsible person: {mitigation.owner || "Not recorded"}</BodyText>
                <BodyTextBold>Recorded implementation evidence</BodyTextBold>
                <BodyText preserveLines>
                  {mitigation.evidence || "Implementation evidence not recorded."}
                </BodyText>
                {mitigation.body.trim() && <Source text={mitigation.body} />}
              </Stack>
            ) : (
              <Box key={id} role="alert">
                <StateMessage
                  icon={<IconAlertCircle />}
                  colour="alert"
                  title="Linked mitigation unavailable"
                  description={`${id} is recorded against this hazard, but its details were not supplied. The mitigation evidence is incomplete in this view.`}
                />
              </Box>
            ),
          )
        )}
      </Stack>
      <Field label="Risk justification" text={hazard.justification} />
      {hazard.body.trim() && (
        <Stack gap={4}>
          <BodyTextBold>Recorded narrative (Markdown)</BodyTextBold>
          <Source text={hazard.body} />
        </Stack>
      )}
    </Stack>
  );
}
