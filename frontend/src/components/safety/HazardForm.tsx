/**
 * HazardForm Component
 *
 * Add or change one hazard: its title, owner and status; its cause,
 * effect and harm; a severity and likelihood before and after
 * mitigation; the justification for its residual risk; and its notes, in
 * the Markdown editor.
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

import { SimpleGrid, Stack } from "@mantine/core";
import { useState } from "react";

import BaseCard from "@/components/base-card/BaseCard";
import ButtonPair from "@/components/button/ButtonPair";
import { SelectField, TextAreaField, TextField } from "@/components/form";
import { BrandSpinner } from "@/components/loading-spinner";
import MarkdownEditor from "@/components/markdown-editor";
import { BodyTextBold, ErrorMessage } from "@/components/typography";
import {
  hazardProblems,
  isHazardStatus,
  isRiskScore,
  previewAssessment as askTheServer,
  type AssessmentInput,
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
  title,
  value,
  options,
  preview,
  onChange,
}: {
  title: string;
  value: AssessmentInput;
  options: HazardOptions;
  preview: PreviewAssessment;
  onChange: (value: AssessmentInput) => void;
}) {
  const level = useAssessmentPreview(value.severity, value.likelihood, preview);

  function score(next: string | null): RiskScore | null {
    const number = Number(next);

    return isRiskScore(number) ? number : null;
  }

  return (
    <BaseCard>
      <Stack gap="sm">
        <BodyTextBold>{title}</BodyTextBold>
        <SelectField
          label="Severity"
          data={options.severity}
          value={String(value.severity)}
          allowDeselect={false}
          onChange={(next) => {
            const severity = score(next);
            if (severity) onChange({ ...value, severity });
          }}
        />
        <SelectField
          label="Likelihood"
          data={options.likelihood}
          value={String(value.likelihood)}
          allowDeselect={false}
          onChange={(next) => {
            const likelihood = score(next);
            if (likelihood) onChange({ ...value, likelihood });
          }}
        />
        {level.state === "ready" && <RiskScoreBadge assessment={level.assessment} />}
        {level.state === "working" && (
          <BrandSpinner label={`Working out the ${title.toLowerCase()} level`} size="2rem" />
        )}
        {level.state === "failed" && (
          <ErrorMessage>
            Turva could not work out the risk level just now. It is worked out again when the
            hazard is saved.
          </ErrorMessage>
        )}
      </Stack>
    </BaseCard>
  );
}

export interface HazardFormProps {
  /** The hazard to start from: `blankHazard()` or `hazardInputFrom(...)` */
  initial: HazardInput;
  /** What `hazard-options/` serves: the scores' words and the statuses */
  options: HazardOptions;
  /**
   * Asks the server for a pair's level. Defaults to `previewAssessment`
   * in `@/lib/safety`; stories and tests pass a stand-in.
   */
  previewAssessment?: PreviewAssessment;
  /** Called with the hazard to save, once it passes the layout rules */
  onSubmit: (hazard: HazardInput) => void;
  onCancel: () => void;
  /** Saving is under way */
  saving?: boolean;
  /** What the save said, if it failed */
  error?: string | null;
}

export default function HazardForm({
  initial,
  options,
  previewAssessment = askTheServer,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: HazardFormProps) {
  const [value, setValue] = useState<HazardInput>(initial);
  const [tried, setTried] = useState(false);

  const problems = hazardProblems(value);
  if (!value.owner.trim()) problems.push("Give the email address of the hazard's owner.");

  const statuses = options.statuses.map((status) => ({
    value: status,
    label: statusLabel(status),
  }));

  function set<K extends keyof HazardInput>(key: K, next: HazardInput[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  function submit() {
    setTried(true);
    if (problems.length === 0) onSubmit(value);
  }

  return (
    <Stack gap="lg">
      <TextField
        label="Hazard"
        required
        value={value.title}
        onChange={(event) => set("title", event.currentTarget.value)}
      />
      <TextField
        label="Owner's email"
        type="email"
        required
        value={value.owner}
        onChange={(event) => set("owner", event.currentTarget.value)}
      />
      <SelectField
        label="Status"
        data={statuses}
        value={value.status}
        allowDeselect={false}
        onChange={(next) => {
          if (next && isHazardStatus(next)) set("status", next);
        }}
      />
      <TextAreaField
        label="Cause"
        autosize
        minRows={2}
        value={value.cause}
        onChange={(event) => set("cause", event.currentTarget.value)}
      />
      <TextAreaField
        label="Effect"
        autosize
        minRows={2}
        value={value.effect}
        onChange={(event) => set("effect", event.currentTarget.value)}
      />
      <TextAreaField
        label="Potential harm"
        autosize
        minRows={2}
        value={value.harm}
        onChange={(event) => set("harm", event.currentTarget.value)}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <AssessmentFields
          title="Initial risk"
          value={value.initial}
          options={options}
          preview={previewAssessment}
          onChange={(next) => set("initial", next)}
        />
        <AssessmentFields
          title="Residual risk"
          value={value.residual}
          options={options}
          preview={previewAssessment}
          onChange={(next) => set("residual", next)}
        />
      </SimpleGrid>
      <TextAreaField
        label="Justification of residual risk"
        autosize
        minRows={2}
        value={value.justification}
        onChange={(event) => set("justification", event.currentTarget.value)}
      />
      <MarkdownEditor label="Notes" value={value.body} onChange={(next) => set("body", next)} />
      {tried && problems.map((problem) => <ErrorMessage key={problem}>{problem}</ErrorMessage>)}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <ButtonPair
        acceptLabel="Save hazard"
        onAccept={submit}
        onCancel={onCancel}
        acceptLoading={saving}
      />
    </Stack>
  );
}
