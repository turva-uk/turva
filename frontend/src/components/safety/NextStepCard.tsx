/**
 * NextStepCard Component
 *
 * Where a safety file stands in its template's process: the next step,
 * what is still outstanding for it, and a way to its guidance. Every
 * step's state is worked out from the file by the API, never stored.
 *
 * **It says where the officer is, never that the file is safe.** Turva's
 * hazard TH-011 names automation bias as the risk of a guided tool, so
 * the wording is "the next step is", and a file with every step done is
 * told only that the process is complete, with the reminder that the
 * judgement is the signers'.
 *
 * @example
 * ```tsx
 * <NextStepCard process={file.process} onOpenGuide={openGuide} />
 * ```
 *
 * Not yet in Turva's API: the template's process steps have no route yet, so this takes them as a prop.
 */

import type { ReactNode } from "react";
import { Group, List, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import IconTextButton from "@/components/button/IconTextButton";
import { BodyText, FieldDescription, Heading } from "@/components/typography";
import type { SafetyProcess } from "@/lib/safety";

export interface NextStepCardProps {
  /** The process, as the file's API response carries it */
  process: SafetyProcess;
  /** Called with a step's id to open its guidance */
  onOpenGuide: (stepId: string) => void;
  /** An action for the next step, such as recording a workshop */
  action?: ReactNode;
}

export default function NextStepCard({ process, onOpenGuide, action }: NextStepCardProps) {
  const index = process.steps.findIndex((step) => step.id === process.next_step);
  const step = index >= 0 ? process.steps[index] : null;
  const done = process.steps.filter((item) => item.done).length;

  if (!step) {
    return (
      <BaseCard data-testid="next-step-card">
        <Stack gap="sm">
          <Heading>Every step of the process is complete</Heading>
          <BodyText>
            This says where the file is in its process. Whether the deployment is acceptably
            safe is the judgement of the people who signed it.
          </BodyText>
        </Stack>
      </BaseCard>
    );
  }

  return (
    <BaseCard data-testid="next-step-card">
      <Stack gap="sm">
        <FieldDescription>
          Step {index + 1} of {process.steps.length}, {done} done
        </FieldDescription>
        <Heading>The next step is: {step.title}</Heading>
        {step.reasons.length > 0 && (
          <List>
            {step.reasons.map((reason) => (
              <List.Item key={reason}>
                <BodyText>{reason}</BodyText>
              </List.Item>
            ))}
          </List>
        )}
        <FieldDescription>
          This says where the file is in its process, not that the deployment is safe.
        </FieldDescription>
        <Group justify="flex-end">
          {action}
          <IconTextButton
            icon="book"
            label="Read the guidance"
            variant="outline"
            onClick={() => onOpenGuide(step.id)}
          />
        </Group>
      </Stack>
    </BaseCard>
  );
}
