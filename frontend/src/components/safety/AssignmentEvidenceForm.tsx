/**
 * AssignmentEvidenceForm Component
 *
 * For somebody asked to evidence one mitigation: its title and where it
 * stands, and the two things they may change, its status and its
 * evidence. Withdrawing a mitigation is the officer's decision, so it is
 * not offered. Saving is a commit naming them.
 *
 * @example
 * ```tsx
 * <AssignmentEvidenceForm assignment={mine} onSubmit={save} />
 * ```
 *
 * Not yet in Turva's API: mitigation assignments have no route yet, so this takes the assignment as a prop.
 */

import { useState } from "react";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import SelectField from "@/components/form/SelectField";
import TextAreaField from "@/components/form/TextAreaField";
import { BodyText, ErrorMessage, FieldDescription, Heading } from "@/components/typography";
import type { AssigneeStatus, MyAssignment } from "@/lib/safety";

const STATUSES: { value: AssigneeStatus; label: string }[] = [
  { value: "proposed", label: "Proposed: not yet in place" },
  { value: "implemented", label: "Implemented: in place" },
  { value: "verified", label: "Verified: shown to work" },
];

export interface AssignmentEvidenceFormProps {
  assignment: MyAssignment;
  onSubmit: (status: AssigneeStatus, evidence: string) => void;
  onCancel?: () => void;
  saving?: boolean;
  error?: string | null;
}

function startingStatus(status: string): AssigneeStatus {
  return STATUSES.some((item) => item.value === status)
    ? (status as AssigneeStatus)
    : "proposed";
}

export default function AssignmentEvidenceForm({
  assignment,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: AssignmentEvidenceFormProps) {
  const { mitigation } = assignment;
  const [status, setStatus] = useState<AssigneeStatus>(startingStatus(mitigation.status));
  const [evidence, setEvidence] = useState(mitigation.evidence);

  return (
    <BaseCard>
      <Stack gap="md">
        <Heading>
          {mitigation.id}: {mitigation.title}
        </Heading>
        <FieldDescription>
          Asked by {assignment.assigned_by_name}, for the safety file for {assignment.file_name}{" "}
          at {assignment.organisation}.
        </FieldDescription>
        {mitigation.body && <BodyText>{mitigation.body}</BodyText>}
        <SelectField
          label="Status"
          data={STATUSES}
          value={status}
          onChange={(value) => value && setStatus(startingStatus(value))}
          allowDeselect={false}
        />
        <TextAreaField
          label="Evidence"
          description="What shows it is in place, or that it works: a test, a date, a document."
          value={evidence}
          onChange={(event) => setEvidence(event.currentTarget.value)}
          autosize
          minRows={4}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ButtonPair
          acceptLabel="Save evidence"
          onAccept={() => onSubmit(status, evidence)}
          acceptLoading={saving}
          onCancel={onCancel}
        />
      </Stack>
    </BaseCard>
  );
}
