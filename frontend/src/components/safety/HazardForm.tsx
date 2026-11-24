/**
 * HazardForm Component
 *
 * Add or change one hazard: its title, owner and status; its cause,
 * effect and harm; a severity and likelihood before and after
 * mitigation; the justification for its residual risk; and its narrative,
 * as Markdown source in a plain text area. The rich Markdown editor is not
 * used here: `SAFETY.md` records that it is not yet used by the
 * application's pages, since it can rewrite what it is given (TH-001).
 *
 * Each pair of scores shows the level the server derives from it, asked
 * of `previewAssessment` as soon as a score is picked. The browser never
 * works a level out and never sends one: the server derives it again on
 * saving, and refuses a body that carries one (TH-008). A level is shown
 * only for the scores now chosen; while the answer is on its way, the
 * form says it is working the level out rather than showing an old one.
 *
 * Two of Turva's layout rules are checked here as well, so an officer
 * hears at once rather than after saving: a residual score may not
 * exceed its initial one, and a closed hazard needs a justification.
 *
 * Which mitigations a hazard relies on is not set here. Turva records it
 * on the mitigation, which names its hazards.
 */

import { Alert, Button, Fieldset, SimpleGrid, Stack } from "@mantine/core";
import { useState, type FormEvent } from "react";

import BaseCard from "@/components/base-card/BaseCard";
import ButtonPair from "@/components/button/ButtonPair";
import { SelectField, TextAreaField, TextField } from "@/components/form";
import { BrandSpinner } from "@/components/loading-spinner";
import { BodyText, BodyTextInline, ErrorMessage } from "@/components/typography";
import { IconAlertTriangle } from "@/components/icons/appIcons";
import { StateMessage } from "@/components/message-cards";
import {
  blankHazard,
  hazardInputFrom,
  hazardProblems,
  isHazardStatus,
  isRiskScore,
  previewAssessment as askTheServer,
  type AssessmentDraft,
  type Hazard,
  type HazardDraft,
  type HazardInput,
  type HazardOptions,
  type RiskScore,
} from "@/lib/safety";

import RiskScoreBadge from "./RiskScoreBadge";
import { useAssessmentPreview, type PreviewAssessment } from "./useAssessmentPreview";

/** "transferred" as "Transferred", for the status select. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function AssessmentFields({
  stage,
  value,
  options,
  preview,
  onChange,
  tried,
  readOnly,
  errors,
}: {
  stage: "initial" | "residual";
  value: AssessmentDraft;
  options: HazardOptions;
  preview: PreviewAssessment;
  onChange: (value: AssessmentDraft) => void;
  tried: boolean;
  readOnly: boolean;
  /** The server's messages for this assessment's scores */
  errors: { severity?: string; likelihood?: string };
}) {
  const title = stage === "initial" ? "Initial assessment" : "Residual assessment";
  const level = useAssessmentPreview(value.severity, value.likelihood, preview);

  function score(next: string | null): RiskScore | null {
    const number = Number(next);

    return isRiskScore(number) ? number : null;
  }

  return (
    <BaseCard>
      <Fieldset legend={<BodyTextInline bold>{title}</BodyTextInline>} variant="unstyled">
        <Stack gap="sm">
          <SelectField
            label={`Severity - ${stage}`}
            required
            readOnly={readOnly}
            aria-readonly={readOnly}
            data={options.severity}
            value={value.severity === null ? null : String(value.severity)}
            placeholder="Select a score"
            error={
              errors.severity ??
              (tried && value.severity === null ? "Choose a severity score." : undefined)
            }
            allowDeselect={false}
            onChange={(next) => {
              const severity = score(next);
              if (severity) onChange({ ...value, severity });
            }}
          />
          <SelectField
            label={`Likelihood - ${stage}`}
            required
            readOnly={readOnly}
            aria-readonly={readOnly}
            data={options.likelihood}
            value={value.likelihood === null ? null : String(value.likelihood)}
            placeholder="Select a score"
            error={
              errors.likelihood ??
              (tried && value.likelihood === null ? "Choose a likelihood score." : undefined)
            }
            allowDeselect={false}
            onChange={(next) => {
              const likelihood = score(next);
              if (likelihood) onChange({ ...value, likelihood });
            }}
          />
          {level.state === "ready" && (
            <Stack gap={4}>
              <BodyText c="dimmed">Derived risk preview - not saved</BodyText>
              <RiskScoreBadge assessment={level.assessment} withScores />
            </Stack>
          )}
          {level.state === "none" && (
            <BodyText c="dimmed">
              Select both scores to see the derived risk. No low-risk value is assumed.
            </BodyText>
          )}
          {level.state === "working" && (
            <BrandSpinner label={`Working out the ${stage} risk level`} size="2rem" />
          )}
          {level.state === "failed" && (
            <ErrorMessage>
              Turva could not work out the risk level just now. It is worked out again when the
              hazard is saved.
            </ErrorMessage>
          )}
        </Stack>
      </Fieldset>
    </BaseCard>
  );
}

export interface HazardFormProps {
  /** Opened record/draft. Omit for a new hazard with no assumed scores. Key/remount deliberately to open another record/version. */
  initial?: Hazard | HazardDraft;
  /** What `hazard-options/` serves: the scores' words and the statuses */
  options: HazardOptions;
  /**
   * Asks the server for a pair's level. Defaults to `previewAssessment`
   * in `@/lib/safety`; stories and tests pass a stand-in.
   */
  previewAssessment?: PreviewAssessment;
  /** Receives a complete write input. The caller owns errors, opened HEAD and navigation guards, and must keep saving=true until its request settles, including after a UI timeout. This component does not reset or navigate. */
  onSubmit: (hazard: HazardInput) => void;
  onCancel: () => void;
  /** Saving is under way */
  saving?: boolean;
  /** What the save said, if it failed */
  error?: string | null;
  /** Revokes editing without replacing the mounted draft. The server remains the authority. */
  readOnly?: boolean;
  /**
   * The server's messages for particular fields, by the name it gives
   * them: `title`, `owner`, `cause`, `initial.severity` and so on. Each
   * shows under its field.
   */
  fieldErrors?: Partial<Record<string, string>>;
  /** The cancel button's words. Defaults to "Cancel". */
  cancelLabel?: string;
}

type OpenedHazard =
  { value: HazardDraft; problem?: never } | { record: Hazard | HazardDraft; problem: string };

function openHazard(record: Hazard | HazardDraft | undefined): OpenedHazard {
  if (!record) return { value: blankHazard() };
  try {
    const value = "id" in record ? hazardInputFrom(record) : record;
    if (!isHazardStatus(value.status))
      throw new Error(`Unsupported recorded status: ${String(value.status)}.`);
    for (const which of ["initial", "residual"] as const) {
      for (const score of ["severity", "likelihood"] as const) {
        if (value[which][score] !== null && !isRiskScore(value[which][score]))
          throw new Error(`Unsupported ${which} ${score}.`);
      }
    }
    return { value };
  } catch (error) {
    return {
      record,
      problem: error instanceof Error ? error.message : "Unsupported recorded assessment.",
    };
  }
}

export default function HazardForm(props: HazardFormProps) {
  const [opened] = useState(() => openHazard(props.initial));
  if (opened.problem !== undefined)
    return (
      <ReadOnlyHazard
        record={opened.record}
        reason={opened.problem}
        onCancel={props.onCancel}
        saving={props.saving}
      />
    );
  return <EditableHazardForm {...props} initial={opened.value} />;
}

function ReadOnlyHazard({
  record,
  reason,
  onCancel,
  saving,
}: {
  record: Hazard | HazardDraft;
  reason: string;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <Stack gap="md">
      <Alert role="alert" color="yellow" title="Read-only hazard">
        {reason} Recorded values are retained below. This version of Turva cannot edit this
        record; no replacement status or score has been chosen.
      </Alert>
      <TextAreaField label="Hazard" value={record.title} readOnly autosize minRows={1} />
      <TextField label="Recorded status" value={record.status} readOnly />
      <TextField label="Owner's email" value={record.owner} readOnly />
      {"id" in record && (
        <BodyText>
          {record.id}. Created {record.created}; updated {record.updated}. Recorded mitigation
          references: {record.mitigations.join(", ") || "None"}.
        </BodyText>
      )}
      <TextAreaField label="Cause" value={record.cause} readOnly autosize />
      <TextAreaField label="Effect" value={record.effect} readOnly autosize />
      <TextAreaField label="Potential harm" value={record.harm} readOnly autosize />
      {(["initial", "residual"] as const).map((which) => (
        <TextField
          key={which}
          label={`Recorded ${which} assessment`}
          value={`Severity ${String(record[which].severity)}, likelihood ${String(record[which].likelihood)}`}
          readOnly
        />
      ))}
      {"id" in record &&
        (["initial", "residual"] as const).map((which) => (
          <TextAreaField
            key={`${which}-level`}
            label={`Recorded ${which} risk level`}
            value={`${String(record[which].risk_level)} - ${record[which].risk_label}`}
            readOnly
            autosize
            minRows={1}
          />
        ))}
      <TextAreaField
        label="Risk justification or closure reason"
        value={record.justification}
        readOnly
        autosize
      />
      <TextAreaField
        label="Additional narrative (Markdown)"
        value={record.body}
        readOnly
        autosize
      />
      <Button variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </Stack>
  );
}

function EditableHazardForm({
  initial,
  options,
  previewAssessment = askTheServer,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
  readOnly = false,
  fieldErrors = {},
  cancelLabel,
}: Omit<HazardFormProps, "initial"> & { initial: HazardDraft }) {
  const [value, setValue] = useState<HazardDraft>(initial);
  const [tried, setTried] = useState(false);

  const problems = hazardProblems(value);
  if (!value.owner.trim()) problems.push("Give the email address of the hazard's owner.");

  const statuses = options.statuses.map((status) => ({
    value: status,
    label: statusLabel(status),
  }));

  function set<K extends keyof HazardDraft>(key: K, next: HazardDraft[K]) {
    if (readOnly) return;
    setValue((current) => ({ ...current, [key]: next }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (saving || readOnly || problems.length !== 0) return;
    const { severity: initialSeverity, likelihood: initialLikelihood } = value.initial;
    const { severity: residualSeverity, likelihood: residualLikelihood } = value.residual;
    if (
      !isRiskScore(initialSeverity) ||
      !isRiskScore(initialLikelihood) ||
      !isRiskScore(residualSeverity) ||
      !isRiskScore(residualLikelihood)
    )
      return;
    onSubmit({
      ...value,
      initial: { severity: initialSeverity, likelihood: initialLikelihood },
      residual: { severity: residualSeverity, likelihood: residualLikelihood },
    });
  }

  return (
    <form onSubmit={submit} onInvalid={() => setTried(true)}>
      <Stack gap="lg">
        {readOnly && (
          <Alert color="yellow" title="Read-only draft">
            Editing is no longer available. Your opened draft is retained; no save is enabled.
          </Alert>
        )}
        <BodyText>This is a draft, not clinical approval. Do not enter patient data.</BodyText>
        <Fieldset variant="unstyled" legend="Hazard details">
          <Stack gap="lg">
            <TextField
              label="Hazard title"
              required
              maxLength={200}
              readOnly={readOnly}
              value={value.title}
              onChange={(event) => set("title", event.currentTarget.value)}
              error={fieldErrors["title"]}
            />
            <TextField
              label="Responsible email address"
              type="email"
              required
              readOnly={readOnly}
              description="This records responsibility. It does not invite anyone or grant access."
              value={value.owner}
              onChange={(event) => set("owner", event.currentTarget.value)}
              error={fieldErrors["owner"]}
            />
            <SelectField
              label="Hazard status"
              readOnly={readOnly}
              aria-readonly={readOnly}
              data={statuses}
              value={value.status}
              allowDeselect={false}
              onChange={(next) => {
                if (next && isHazardStatus(next)) set("status", next);
              }}
              error={fieldErrors["status"]}
            />
            {value.status !== "open" && (
              <StateMessage
                icon={<IconAlertTriangle />}
                colour="warning"
                title="Closing or transferring does not reduce risk"
                description="The assessment and history remain. Closing needs a reason; transferring does not record acceptance by another organisation."
              />
            )}
            <TextAreaField
              label="Cause"
              required
              description="What could cause this hazard?"
              readOnly={readOnly}
              autosize
              minRows={3}
              value={value.cause}
              onChange={(event) => set("cause", event.currentTarget.value)}
              error={fieldErrors["cause"]}
            />
            <TextAreaField
              label="Effect on the care pathway"
              required
              description="What happens to the care process?"
              readOnly={readOnly}
              autosize
              minRows={3}
              value={value.effect}
              onChange={(event) => set("effect", event.currentTarget.value)}
              error={fieldErrors["effect"]}
            />
            <TextAreaField
              label="Potential harm"
              required
              description="What harm could follow for a patient or other person?"
              readOnly={readOnly}
              autosize
              minRows={3}
              value={value.harm}
              onChange={(event) => set("harm", event.currentTarget.value)}
              error={fieldErrors["harm"]}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <AssessmentFields
                stage="initial"
                value={value.initial}
                options={options}
                preview={previewAssessment}
                onChange={(next) => set("initial", next)}
                tried={tried}
                readOnly={readOnly}
                errors={{
                  severity: fieldErrors["initial.severity"],
                  likelihood: fieldErrors["initial.likelihood"],
                }}
              />
              <AssessmentFields
                stage="residual"
                value={value.residual}
                options={options}
                preview={previewAssessment}
                onChange={(next) => set("residual", next)}
                tried={tried}
                readOnly={readOnly}
                errors={{
                  severity: fieldErrors["residual.severity"],
                  likelihood: fieldErrors["residual.likelihood"],
                }}
              />
            </SimpleGrid>
            <BodyText c="dimmed">
              Residual severity and likelihood cannot exceed the initial scores. Risk level is
              calculated on the server and cannot be entered.
            </BodyText>
            <TextAreaField
              label="Risk justification or closure reason"
              required={value.status === "closed"}
              readOnly={readOnly}
              autosize
              minRows={3}
              value={value.justification}
              onChange={(event) => set("justification", event.currentTarget.value)}
              error={fieldErrors["justification"]}
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
        {tried && problems.length > 0 && (
          <Stack role="alert" aria-label="Hazard validation problems" gap="xs">
            {problems.map((problem) => (
              <ErrorMessage key={problem}>{problem}</ErrorMessage>
            ))}
          </Stack>
        )}
        {error && (
          <span role="alert">
            <ErrorMessage>{error}</ErrorMessage>
          </span>
        )}
        <ButtonPair
          acceptLabel="Save hazard"
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
