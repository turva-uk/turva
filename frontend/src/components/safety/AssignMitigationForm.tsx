/**
 * AssignMitigationForm Component
 *
 * Asking a member of the file's organisation to evidence one mitigation.
 * They need not hold any safety competency: they may change that
 * mitigation's status and evidence and nothing else, and every change is
 * a commit naming them. Offers only mitigations still to do and not
 * already out with somebody.
 *
 * @example
 * ```tsx
 * <AssignMitigationForm
 *   mitigations={file.mitigations}
 *   assignments={file.assignments ?? []}
 *   members={file.members ?? []}
 *   onSubmit={assign}
 * />
 * ```
 *
 * Not yet in Turva's API: mitigation assignments have no route yet, so this takes everything as props.
 */

import { useState } from "react";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import SelectField from "@/components/form/SelectField";
import { ErrorMessage, FieldDescription, Heading } from "@/components/typography";
import type { Assignment, Member, Mitigation } from "@/lib/safety";

export interface AssignMitigationFormProps {
  mitigations: Mitigation[];
  assignments: Assignment[];
  members: Member[];
  onSubmit: (mitigationId: string, assigneeId: string) => void;
  saving?: boolean;
  error?: string | null;
}

const DONE = new Set(["implemented", "verified", "withdrawn"]);

export default function AssignMitigationForm({
  mitigations,
  assignments,
  members,
  onSubmit,
  saving = false,
  error = null,
}: AssignMitigationFormProps) {
  const [mitigation, setMitigation] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const out = new Set(assignments.map((item) => item.mitigation_id));
  const open = mitigations.filter((item) => !DONE.has(item.status) && !out.has(item.id));

  return (
    <BaseCard>
      <Stack gap="md">
        <Heading>Ask somebody to evidence a mitigation</Heading>
        <FieldDescription>
          They may change that mitigation&apos;s status and evidence, and nothing else in the
          file.
        </FieldDescription>
        <SelectField
          label="Mitigation"
          placeholder={open.length ? "Choose a mitigation" : "Every mitigation is done or out"}
          data={open.map((item) => ({
            value: item.id,
            label: `${item.id}: ${item.title}`,
          }))}
          value={mitigation}
          onChange={setMitigation}
          disabled={open.length === 0}
        />
        <SelectField
          label="Who"
          placeholder="Choose a member of the organisation"
          data={members.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          value={assignee}
          onChange={setAssignee}
          searchable
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ButtonPair
          acceptLabel="Assign"
          onAccept={() => {
            if (mitigation && assignee) onSubmit(mitigation, assignee);
          }}
          acceptDisabled={!mitigation || !assignee}
          acceptLoading={saving}
          cancelLabel="Clear"
          onCancel={() => {
            setMitigation(null);
            setAssignee(null);
          }}
        />
      </Stack>
    </BaseCard>
  );
}
