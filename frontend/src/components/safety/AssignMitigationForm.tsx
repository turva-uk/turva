/**
 * AssignMitigationForm Component
 *
 * Asking a member of the file's organisation to evidence one mitigation.
 * A proposed interface for requesting implementation evidence from a
 * delegate. It grants no access and creates no assignment or commit.
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

import { useState, type FormEvent } from "react";
import { Alert, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import SelectField from "@/components/form/SelectField";
import { BodyText, ErrorMessage, FieldDescription, Heading } from "@/components/typography";
import type { Assignment, Member, Mitigation } from "@/lib/safety";

export interface AssignMitigationFormProps {
  mitigations: Mitigation[];
  assignments: Assignment[];
  members: Member[];
  onSubmit: (mitigationId: string, assigneeId: string) => void;
  saving?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

const KNOWN_STATUSES = new Set(["proposed", "implemented", "verified", "withdrawn"]);
type Choice = { value: string; label: string };

export default function AssignMitigationForm({
  mitigations,
  assignments,
  members,
  onSubmit,
  saving = false,
  error = null,
  readOnly = false,
}: AssignMitigationFormProps) {
  const [mitigation, setMitigation] = useState<Choice | null>(null);
  const [assignee, setAssignee] = useState<Choice | null>(null);
  const [tried, setTried] = useState(false);
  const out = new Set(assignments.map((item) => item.mitigation_id));
  const open = mitigations.filter((item) => item.status === "proposed" && !out.has(item.id));
  const unsupported = mitigations.filter((item) => !KNOWN_STATUSES.has(item.status));
  const mitigationChoices = open.map((item) => ({
    value: item.id,
    label: `${item.id}: ${item.title}`,
  }));
  const memberChoices = members.map((item) => ({ value: item.id, label: item.name }));
  const missingMitigation =
    !!mitigation &&
    !mitigationChoices.some(
      (item) => item.value === mitigation.value && item.label === mitigation.label,
    );
  const missingMember =
    !!assignee &&
    !memberChoices.some(
      (item) => item.value === assignee.value && item.label === assignee.label,
    );
  const locked = saving || readOnly;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (locked || !mitigation || !assignee || missingMitigation || missingMember) return;
    onSubmit(mitigation.value, assignee.value);
  }

  return (
    <BaseCard>
      <form aria-label="Assign a mitigation" onSubmit={submit}>
        <Stack gap="md">
          <Heading>Ask somebody to evidence a mitigation</Heading>
          <FieldDescription>
            This proposal requests implementation evidence for CSO review. No access, assignment
            or independent verification authority is granted by this form.
          </FieldDescription>
          {unsupported.length > 0 && (
            <Alert role="alert" color="yellow" title="Unsupported mitigation status">
              Mitigations with an unsupported recorded status are not offered for assignment.
              {unsupported.map((item) => (
                <BodyText preserveLines key={item.id}>
                  {item.id}: {item.status}
                </BodyText>
              ))}
            </Alert>
          )}
          {(missingMitigation || missingMember) && (
            <Alert role="alert" color="yellow" title="Selected assignment unavailable">
              A selected mitigation or member is now unavailable. The selections are retained;
              choose an eligible replacement or deliberately clear them before continuing.
            </Alert>
          )}
          <SelectField
            label="Mitigation"
            placeholder={
              open.length ? "Choose a mitigation" : "No eligible mitigations supplied"
            }
            data={
              missingMitigation && mitigation
                ? [
                    ...mitigationChoices.filter((item) => item.value !== mitigation.value),
                    { ...mitigation, disabled: true },
                  ]
                : mitigationChoices
            }
            value={mitigation?.value ?? null}
            description={mitigation ? `Selected: ${mitigation.label}` : undefined}
            onChange={(value) => {
              if (!locked)
                setMitigation(mitigationChoices.find((item) => item.value === value) ?? null);
            }}
            readOnly={locked}
            error={
              missingMitigation
                ? "This selected mitigation is no longer eligible."
                : tried && !mitigation
                  ? "Choose a mitigation."
                  : undefined
            }
          />
          <SelectField
            label="Who"
            placeholder="Choose a member of the organisation"
            data={
              missingMember && assignee
                ? [
                    ...memberChoices.filter((item) => item.value !== assignee.value),
                    { ...assignee, disabled: true },
                  ]
                : memberChoices
            }
            value={assignee?.value ?? null}
            description={assignee ? `Selected: ${assignee.label}` : undefined}
            onChange={(value) => {
              if (!locked)
                setAssignee(memberChoices.find((item) => item.value === value) ?? null);
            }}
            searchable
            readOnly={locked}
            error={
              missingMember
                ? "This selected member is no longer available."
                : tried && !assignee
                  ? "Choose a member."
                  : undefined
            }
          />
          {error && (
            <div role="alert">
              <ErrorMessage>{error}</ErrorMessage>
            </div>
          )}
          <ButtonPair
            acceptLabel="Assign"
            acceptType="submit"
            acceptDisabled={
              locked || !mitigation || !assignee || missingMitigation || missingMember
            }
            acceptLoading={saving}
            cancelLabel="Clear"
            onCancel={() => {
              if (locked) return;
              setMitigation(null);
              setAssignee(null);
              setTried(false);
            }}
            cancelDisabled={locked}
          />
        </Stack>
      </form>
    </BaseCard>
  );
}
