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
 * The notes are the officer's Markdown, shown through `MarkdownView`,
 * which sanitises what it renders: a safety file's text is untrusted.
 */

import { SimpleGrid, Stack } from "@mantine/core";

import BaseCard from "@/components/base-card/BaseCard";
import { ResultMessage } from "@/components/message-cards";
import { BodyText, BodyTextBold, Heading, MarkdownView } from "@/components/typography";
import type { Assessment, Hazard, HazardOptions, Mitigation } from "@/lib/safety";

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
  if (!text.trim()) return null;

  return (
    <Stack gap={4}>
      <BodyTextBold>{label}</BodyTextBold>
      <BodyText>{text}</BodyText>
    </Stack>
  );
}

export interface HazardDetailProps {
  hazard: Hazard;
  /** The file's mitigations, so the ones this hazard names can be shown */
  mitigations: Mitigation[];
  /** What `hazard-options/` serves, to put words to each score */
  options?: HazardOptions;
}

export default function HazardDetail({ hazard, mitigations, options }: HazardDetailProps) {
  const named = mitigations.filter((m) => hazard.mitigations.includes(m.id));

  return (
    <Stack gap="lg">
      {hazard.requires_elimination && hazard.status === "open" && (
        <ResultMessage
          variant="warning"
          title="This hazard blocks go-live"
          subtitle="Its residual risk level must be reduced before deployment."
        />
      )}
      <Field label="Cause" text={hazard.cause} />
      <Field label="Effect" text={hazard.effect} />
      <Field label="Potential harm" text={hazard.harm} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <AssessmentCard title="Initial risk" assessment={hazard.initial} options={options} />
        <AssessmentCard title="Residual risk" assessment={hazard.residual} options={options} />
      </SimpleGrid>
      <Stack gap="xs">
        <Heading>Mitigations</Heading>
        {named.length === 0 ? (
          <BodyText c="dimmed">No mitigation is recorded against it.</BodyText>
        ) : (
          named.map((mitigation) => (
            <BodyText key={mitigation.id}>
              {mitigation.id}: {mitigation.title} ({mitigation.control_type},{" "}
              {mitigation.status})
            </BodyText>
          ))
        )}
      </Stack>
      <Field label="Justification of residual risk" text={hazard.justification} />
      {hazard.body.trim() && <MarkdownView source={hazard.body} />}
    </Stack>
  );
}
