/**
 * WorkshopForm Component
 *
 * Retained proposal for a workshop record: outside the funded build,
 * whose workshops remain reminder-only. This form writes no evidence.
 *
 * Attendees are typed one per line. Nothing is sent with no attendees.
 *
 * @example
 * ```tsx
 * <WorkshopForm hazards={file.hazards} onSubmit={save} onCancel={back} />
 * ```
 *
 * Not yet in Turva's API: hazard workshops have no route yet, so this hands the workshop to its caller.
 */

import { useState, type FormEvent } from "react";
import { Alert, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import DateField from "@/components/form/DateField";
import MultiSelectField from "@/components/form/MultiSelectField";
import TextAreaField from "@/components/form/TextAreaField";
import { BodyText, ErrorMessage } from "@/components/typography";
import { parseDateInput } from "@/components/form/parseDateInput";
import type { Hazard, WorkshopInput } from "@/lib/safety";

export interface WorkshopFormProps {
  /** The file's hazards, any of which the workshop may have raised */
  hazards: Hazard[];
  /** The date to start from, as YYYY-MM-DD */
  today: string;
  /** Called with the workshop; the page adds the head it read */
  onSubmit: (workshop: WorkshopInput) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

export default function WorkshopForm({
  hazards,
  today,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
  readOnly = false,
}: WorkshopFormProps) {
  const [heldOn, setHeldOn] = useState<string | null>(today);
  const [attendees, setAttendees] = useState("");
  const [raised, setRaised] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);
  const editable = !saving && !readOnly;
  const people = attendees
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const dateProblem =
    !heldOn || parseDateInput(heldOn, "YYYY-MM-DD") !== heldOn
      ? "Say when the workshop was held, using a valid calendar date."
      : null;
  const peopleProblem = people.length === 0 ? "Name at least one person who attended." : null;
  const unavailable = raised.filter((id) => !hazards.some((hazard) => hazard.id === id));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (!editable || dateProblem || peopleProblem || !heldOn || unavailable.length > 0) return;
    onSubmit({ held_on: heldOn, attendees: people, hazards: raised, notes });
  }

  return (
    <BaseCard>
      <form aria-label="Proposed workshop record" onSubmit={submit} noValidate>
        <Stack gap="md">
          <BodyText>
            Retained proposal only. Workshop recording is outside funded phase-one scope; this
            form does not record a workshop.
          </BodyText>
          {unavailable.length > 0 && (
            <Alert role="alert" color="yellow" title="Selected hazards unavailable">
              Some selected hazards are no longer in the supplied list. Their identifiers are
              retained; resolve the selection before submitting this proposal.
            </Alert>
          )}
          <DateField
            label="Held on"
            value={heldOn}
            onChange={(value) => {
              if (editable) setHeldOn(value);
            }}
            required
            readOnly={!editable}
            popoverProps={!editable ? { opened: false } : undefined}
            error={tried ? dateProblem : undefined}
          />
          <TextAreaField
            label="Attendees"
            description="One person per line, with their role."
            value={attendees}
            onChange={(event) => {
              if (editable) setAttendees(event.currentTarget.value);
            }}
            readOnly={!editable}
            error={tried ? peopleProblem : undefined}
            autosize
            minRows={3}
            required
          />
          <MultiSelectField
            label="Hazards it raised"
            data={[
              ...hazards.map((hazard) => ({
                value: hazard.id,
                label: `${hazard.id}: ${hazard.title}`,
              })),
              ...unavailable.map((id) => ({
                value: id,
                label: `${id}: unavailable`,
              })),
            ]}
            value={raised}
            onChange={(value) => {
              if (
                editable &&
                value.every(
                  (id) => raised.includes(id) || hazards.some((hazard) => hazard.id === id),
                )
              )
                setRaised(value);
            }}
            searchable
            readOnly={!editable}
            error={
              unavailable.length ? "Resolve the unavailable hazard selections." : undefined
            }
          />
          <TextAreaField
            label="Notes"
            value={notes}
            onChange={(event) => {
              if (editable) setNotes(event.currentTarget.value);
            }}
            readOnly={!editable}
            autosize
            minRows={3}
          />
          {error && (
            <div role="alert">
              <ErrorMessage>{error}</ErrorMessage>
            </div>
          )}
          <ButtonPair
            acceptLabel="Record workshop"
            acceptType="submit"
            acceptDisabled={!editable || unavailable.length > 0}
            onCancel={onCancel}
            cancelDisabled={saving}
            acceptLoading={saving}
          />
        </Stack>
      </form>
    </BaseCard>
  );
}
