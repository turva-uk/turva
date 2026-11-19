/**
 * AssignmentEvidenceForm Component
 *
 * For somebody asked to evidence one mitigation: its title and where it
 * stands, and the two things they may change, its status and its
 * evidence. Withdrawing a mitigation is the officer's decision, so it is
 * not offered. Delegates submit implementation evidence for a CSO to
 * verify or return. This proposal does not save or grant access.
 *
 * @example
 * ```tsx
 * <AssignmentEvidenceForm assignment={mine} onSubmit={save} />
 * ```
 *
 * Not yet in Turva's API: mitigation assignments have no route yet, so this takes the assignment as a prop.
 */

import { useState, type FormEvent } from "react";
import { Alert, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import SelectField from "@/components/form/SelectField";
import TextAreaField from "@/components/form/TextAreaField";
import { BodyText, ErrorMessage, FieldDescription, Heading } from "@/components/typography";
import type { AssigneeStatus, MyAssignment } from "@/lib/safety";
import { assignmentContext, isAssigneeStatus, isFullSourceVersion } from "./proposedWorkflow";

const STATUSES: { value: AssigneeStatus; label: string }[] = [
  { value: "proposed", label: "Proposed: not yet in place" },
  { value: "implemented", label: "Implemented: in place" },
];

export interface AssignmentEvidenceFormProps {
  assignment: MyAssignment;
  /** Receives the opened version, never a refreshed HEAD. Caller owns persistence and pending/navigation guards. */
  onSubmit: (status: AssigneeStatus, evidence: string, expectedHead: string) => void;
  onCancel?: () => void;
  saving?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

export default function AssignmentEvidenceForm({
  assignment,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
  readOnly = false,
}: AssignmentEvidenceFormProps) {
  const [opened] = useState(() => ({
    ...assignment,
    mitigation: { ...assignment.mitigation },
  }));
  const { mitigation } = opened;
  const [status, setStatus] = useState(mitigation.status);
  const [evidence, setEvidence] = useState(mitigation.evidence);
  const [tried, setTried] = useState(false);
  const [recordChanged, setRecordChanged] = useState(false);
  const differs = assignmentContext(assignment) !== assignmentContext(opened);
  if (differs && !recordChanged) setRecordChanged(true);
  const changed = recordChanged || differs;
  const supported = isAssigneeStatus(mitigation.status);
  const sourceAvailable = isFullSourceVersion(opened.head_sha);
  const editable = !readOnly && !saving && !changed && supported && sourceAvailable;
  const evidenceProblem =
    status === "implemented" && !evidence.trim()
      ? "Record an evidence statement before marking the mitigation implemented."
      : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (
      !editable ||
      !isAssigneeStatus(status) ||
      !isFullSourceVersion(opened.head_sha) ||
      evidenceProblem
    )
      return;
    onSubmit(status, evidence, opened.head_sha);
  }

  return (
    <BaseCard>
      <form aria-label="Mitigation evidence" onSubmit={submit}>
        <Stack gap="md">
          <Heading>
            {mitigation.id}: {mitigation.title}
          </Heading>
          <FieldDescription>
            Asked by {opened.assigned_by_name}, for the safety file for {opened.file_name} at{" "}
            {opened.organisation}.
          </FieldDescription>
          <BodyText preserveLines>Opened version: {opened.head_sha ?? "Not supplied"}</BodyText>
          <BodyText>
            Implementation evidence is a recorded claim for CSO review, not Turva verifying that
            a control works.
          </BodyText>
          {(changed || !supported || !sourceAvailable) && (
            <Alert role="alert" color="yellow" title="Read-only opened assignment">
              {changed
                ? "The incoming record is not the opened assignment/version. Resolve this retained draft before deliberately opening another version."
                : !sourceAvailable
                  ? "The opened assignment has no supported full source version."
                  : `Recorded status ${mitigation.status} cannot be changed by this delegate form. No replacement status was chosen.`}
            </Alert>
          )}
          {mitigation.body && <BodyText preserveLines>{mitigation.body}</BodyText>}
          <SelectField
            label="Status"
            data={supported ? STATUSES : [{ value: status, label: status }]}
            value={status}
            onChange={(value) => {
              if (editable && isAssigneeStatus(value)) setStatus(value);
            }}
            allowDeselect={false}
            readOnly={!editable}
          />
          <TextAreaField
            label="Evidence"
            description="What shows it is in place, or that it works: a test, a date, a document."
            value={evidence}
            onChange={(event) => {
              if (editable) setEvidence(event.currentTarget.value);
            }}
            readOnly={!editable}
            error={tried ? evidenceProblem : undefined}
            autosize
            minRows={4}
          />
          {error && (
            <div role="alert">
              <ErrorMessage>{error}</ErrorMessage>
            </div>
          )}
          <ButtonPair
            acceptLabel="Save evidence"
            acceptType="submit"
            acceptDisabled={!editable}
            acceptLoading={saving}
            onCancel={onCancel}
            cancelDisabled={saving}
          />
        </Stack>
      </form>
    </BaseCard>
  );
}
