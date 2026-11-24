/**
 * MitigationForm Component
 *
 * Add or change one mitigation: its title, responsible person, control
 * type and status; the hazards it addresses; its implementation and
 * verification evidence; and its narrative, as Markdown source in a plain
 * text area, as `HazardForm` takes a hazard's (TH-001).
 *
 * Turva records the link between a hazard and a mitigation on the
 * mitigation, so this form names the hazards it addresses. Linking,
 * implementing, verifying or withdrawing a mitigation never changes a
 * hazard's severity or likelihood: the form says so, and nothing it hands
 * back carries a risk level (TH-008).
 *
 * It hands back a `MitigationInput` and nothing else. The version the page
 * opened goes to `addMitigation` or `updateMitigation` as `expected_head`,
 * so a stale form is refused rather than overwriting newer evidence.
 *
 * A record with a status or control type Turva does not know opens read
 * only, with the recorded values kept, rather than replacing them.
 *
 * @example
 * ```tsx
 * <MitigationForm
 *   initial={detail.mitigation}
 *   hazards={detail.hazards}
 *   options={options}
 *   onSubmit={save}
 *   onCancel={back}
 * />
 * ```
 */

import { Box, Fieldset, Stack } from "@mantine/core";
import { useState, type FormEvent } from "react";

import ButtonPair from "@/components/button/ButtonPair";
import SecondaryButton from "@/components/button/SecondaryButton";
import { MultiSelectField, SelectField, TextAreaField, TextField } from "@/components/form";
import { IconAlertTriangle } from "@/components/icons/appIcons";
import { StateMessage } from "@/components/message-cards";
import { BodyText, ErrorMessage } from "@/components/typography";
import {
  blankMitigation,
  completeMitigation,
  isControlType,
  isMitigationStatus,
  mitigationInputFrom,
  mitigationProblems,
  type Hazard,
  type Mitigation,
  type MitigationDraft,
  type MitigationInput,
  type MitigationOptions,
} from "@/lib/safety";

/** "implemented" as "Implemented", for the selects. */
function capitalised(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface MitigationFormProps {
  /** The record or draft opened. Omit for a new mitigation. Key or remount to open another. */
  initial?: Mitigation | MitigationDraft;
  /** The file's hazards, for choosing the ones this mitigation addresses */
  hazards: Hazard[];
  /** What `mitigation-options/` serves: the statuses and control types */
  options: MitigationOptions;
  /** Receives a complete write input. The caller owns the opened version, errors and navigation. */
  onSubmit: (mitigation: MitigationInput) => void;
  onCancel: () => void;
  /** Saving is under way */
  saving?: boolean;
  /** Revokes editing without replacing the draft. The server remains the authority. */
  readOnly?: boolean;
  /**
   * The server's messages for particular fields, by the name it gives
   * them: `title`, `owner`, `control_type`, `hazards` and so on. Each
   * shows under its field.
   */
  fieldErrors?: Partial<Record<string, string>>;
  /** The cancel button's words. Defaults to "Cancel". */
  cancelLabel?: string;
}

type Opened =
  { value: MitigationDraft; problem?: never } | { record: Mitigation; problem: string };

function openMitigation(record: Mitigation | MitigationDraft | undefined): Opened {
  if (!record) return { value: blankMitigation() };
  if (!("id" in record)) return { value: record };

  try {
    return { value: mitigationInputFrom(record) };
  } catch (error) {
    return {
      record,
      problem: error instanceof Error ? error.message : "Unsupported recorded mitigation.",
    };
  }
}

export default function MitigationForm(props: MitigationFormProps) {
  const [opened] = useState(() => openMitigation(props.initial));

  if (opened.problem !== undefined) {
    return (
      <ReadOnlyMitigation
        record={opened.record}
        reason={opened.problem}
        onCancel={props.onCancel}
      />
    );
  }

  return <EditableMitigationForm {...props} initial={opened.value} />;
}

function ReadOnlyMitigation({
  record,
  reason,
  onCancel,
}: {
  record: Mitigation;
  reason: string;
  onCancel: () => void;
}) {
  return (
    <Stack gap="md">
      <Box role="alert">
        <StateMessage
          icon={<IconAlertTriangle />}
          colour="warning"
          title="Read-only mitigation"
          description={`${reason} Recorded values are kept below. This version of Turva cannot edit this record, and has not chosen a replacement.`}
        />
      </Box>
      <TextField label="Mitigation title" value={record.title} readOnly />
      <TextField label="Recorded status" value={record.status} readOnly />
      <TextField label="Recorded control type" value={record.control_type} readOnly />
      <TextField label="Responsible email address" value={record.owner} readOnly />
      <TextField
        label="Linked hazards"
        value={record.hazards.join(", ") || "None recorded"}
        readOnly
      />
      <TextAreaField
        label="Implementation and verification evidence"
        value={record.evidence}
        readOnly
        autosize
      />
      <TextAreaField
        label="Additional narrative (Markdown)"
        value={record.body}
        readOnly
        autosize
      />
      <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
    </Stack>
  );
}

function EditableMitigationForm({
  initial,
  hazards,
  options,
  onSubmit,
  onCancel,
  saving = false,
  readOnly = false,
  fieldErrors = {},
  cancelLabel,
}: Omit<MitigationFormProps, "initial"> & { initial: MitigationDraft }) {
  const [value, setValue] = useState<MitigationDraft>(initial);
  const [tried, setTried] = useState(false);

  const problems = mitigationProblems(value);
  const evidenceRequired = value.status === "implemented" || value.status === "verified";
  const hazardChoices = hazards.map((hazard) => ({
    value: hazard.id,
    label: `${hazard.id}: ${hazard.title}`,
  }));
  // A link to a hazard not in the list is kept, and shown, rather than dropped.
  for (const id of value.hazards) {
    if (!hazardChoices.some((choice) => choice.value === id)) {
      hazardChoices.push({ value: id, label: id });
    }
  }

  function set<K extends keyof MitigationDraft>(key: K, next: MitigationDraft[K]) {
    if (readOnly) return;
    setValue((current) => ({ ...current, [key]: next }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (saving || readOnly) return;

    const complete = completeMitigation(value);
    if (complete) onSubmit(complete);
  }

  return (
    <form onSubmit={submit} onInvalid={() => setTried(true)} noValidate>
      <Stack gap="lg">
        {readOnly && (
          <StateMessage
            icon={<IconAlertTriangle />}
            colour="warning"
            title="Read-only draft"
            description="Editing is no longer available. Your opened draft is kept; no save is enabled."
          />
        )}
        <Fieldset variant="unstyled" legend="Mitigation details">
          <Stack gap="lg">
            <TextField
              label="Mitigation title"
              required
              maxLength={200}
              readOnly={readOnly}
              value={value.title}
              onChange={(event) => set("title", event.currentTarget.value)}
              error={
                fieldErrors["title"] ??
                (tried && !value.title.trim() ? "Give the mitigation a title." : undefined)
              }
            />
            <TextField
              label="Responsible email address"
              type="email"
              required
              readOnly={readOnly}
              description="This records responsibility. It does not invite anyone or grant access."
              value={value.owner}
              onChange={(event) => set("owner", event.currentTarget.value)}
              error={
                fieldErrors["owner"] ??
                (tried && !value.owner.trim()
                  ? "Give the email address of the responsible person."
                  : undefined)
              }
            />
            <SelectField
              label="Control type"
              required
              readOnly={readOnly}
              aria-readonly={readOnly}
              description="Controls are listed strongest first: elimination, technical, warning, then procedural."
              placeholder="Select a control type"
              data={options.control_types.map((type) => ({
                value: type,
                label: capitalised(type),
              }))}
              value={value.control_type}
              allowDeselect={false}
              onChange={(next) => {
                if (next && isControlType(next)) set("control_type", next);
              }}
              error={
                fieldErrors["control_type"] ??
                (tried && value.control_type === null ? "Choose a control type." : undefined)
              }
            />
            <SelectField
              label="Mitigation status"
              readOnly={readOnly}
              aria-readonly={readOnly}
              data={options.statuses.map((status) => ({
                value: status,
                label: capitalised(status),
              }))}
              value={value.status}
              allowDeselect={false}
              onChange={(next) => {
                if (next && isMitigationStatus(next)) set("status", next);
              }}
              error={fieldErrors["status"]}
            />
            <MultiSelectField
              label="Linked hazards"
              description="Adding or removing a link updates both records. It does not change the hazard's assessment."
              readOnly={readOnly}
              data={hazardChoices}
              value={value.hazards}
              searchable
              nothingFoundMessage="No hazards match"
              placeholder={value.hazards.length === 0 ? "Optional: choose hazards" : undefined}
              onChange={(next) => set("hazards", next)}
              error={fieldErrors["hazards"]}
            />
            <TextAreaField
              label="Implementation and verification evidence"
              required={evidenceRequired}
              readOnly={readOnly}
              description="Record what demonstrates the control is in place and effective: a test, report, date or document reference. Proposed controls are not evidence of risk reduction."
              autosize
              minRows={4}
              value={value.evidence}
              onChange={(event) => set("evidence", event.currentTarget.value)}
              error={
                fieldErrors["evidence"] ??
                (tried && evidenceRequired && !value.evidence.trim()
                  ? `A mitigation marked ${value.status} needs implementation and verification evidence.`
                  : undefined)
              }
            />
            <TextAreaField
              label="Additional narrative (Markdown)"
              readOnly={readOnly}
              autosize
              minRows={5}
              value={value.body}
              onChange={(event) => set("body", event.currentTarget.value)}
              error={fieldErrors["body"]}
            />
          </Stack>
        </Fieldset>
        <StateMessage
          icon={<IconAlertTriangle />}
          colour="warning"
          title="Mitigation status does not change risk"
          description="Linking, implementing, verifying or withdrawing a mitigation never changes a hazard's severity or likelihood automatically. Review the assessment separately. A recorded verification is the author's judgement, not certification by Turva."
        />
        {tried && problems.length > 0 && (
          <Stack role="alert" aria-label="Mitigation validation problems" gap="xs">
            {problems.map((problem) => (
              <ErrorMessage key={problem}>{problem}</ErrorMessage>
            ))}
          </Stack>
        )}
        <BodyText>
          This is a record of evidence, not clinical approval. Do not enter patient data.
        </BodyText>
        <ButtonPair
          acceptLabel="Save mitigation"
          acceptType="submit"
          acceptDisabled={readOnly}
          onCancel={onCancel}
          cancelLabel={cancelLabel}
          acceptLoading={saving}
          cancelDisabled={saving}
        />
      </Stack>
    </form>
  );
}
