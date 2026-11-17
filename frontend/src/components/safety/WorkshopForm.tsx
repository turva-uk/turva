/**
 * WorkshopForm Component
 *
 * Recording a hazard workshop: when it was held, who came, which hazards
 * it raised, and any notes. The one step of the process the repository
 * cannot otherwise show happened (DCB0160 4.1.2 asks for a
 * multi-disciplinary group), so it is written into the file as a dated
 * page under `docs/workshops/`.
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

import { useState } from "react";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { ButtonPair } from "@/components/button";
import DateField from "@/components/form/DateField";
import MultiSelectField from "@/components/form/MultiSelectField";
import TextAreaField from "@/components/form/TextAreaField";
import { ErrorMessage } from "@/components/typography";
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
}

export default function WorkshopForm({
  hazards,
  today,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: WorkshopFormProps) {
  const [heldOn, setHeldOn] = useState<string | null>(today);
  const [attendees, setAttendees] = useState("");
  const [raised, setRaised] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function submit() {
    const people = attendees
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!heldOn) {
      setProblem("Say when the workshop was held.");
      return;
    }

    if (people.length === 0) {
      setProblem("Name at least one person who attended.");
      return;
    }

    setProblem(null);
    onSubmit({ held_on: heldOn, attendees: people, hazards: raised, notes });
  }

  return (
    <BaseCard>
      <Stack gap="md">
        <DateField
          label="Held on"
          value={heldOn}
          onChange={(value) => setHeldOn(value)}
          required
        />
        <TextAreaField
          label="Attendees"
          description="One person per line, with their role."
          value={attendees}
          onChange={(event) => setAttendees(event.currentTarget.value)}
          autosize
          minRows={3}
          required
        />
        <MultiSelectField
          label="Hazards it raised"
          data={hazards.map((hazard) => ({
            value: hazard.id,
            label: `${hazard.id}: ${hazard.title}`,
          }))}
          value={raised}
          onChange={setRaised}
          searchable
        />
        <TextAreaField
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.currentTarget.value)}
          autosize
          minRows={3}
        />
        {(problem ?? error) && <ErrorMessage>{problem ?? error}</ErrorMessage>}
        <ButtonPair
          acceptLabel="Record workshop"
          onAccept={submit}
          onCancel={onCancel}
          acceptLoading={saving}
        />
      </Stack>
    </BaseCard>
  );
}
