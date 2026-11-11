import {
  Alert,
  Anchor,
  Box,
  Button,
  Fieldset,
  Loader,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router";

import { api } from "../api/client";
import type {
  Assessment,
  Hazard,
  HazardDetail,
  HazardOptions,
  SafetyFile,
  SafetyFileDetail,
} from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { RiskLevel } from "../components/RiskLevel";
import { SaveFailure } from "../components/SaveFailure";

export function HazardFormPage({ editing = false }: { editing?: boolean }) {
  const { slug, hazardId } = useParams();
  const path = editing
    ? `/safety-files/${slug}/hazards/${hazardId}/`
    : `/safety-files/${slug}/`;
  const { data, error } = useApiResource<SafetyFileDetail | HazardDetail>(path);
  const options = useApiResource<HazardOptions>("/hazard-options/");
  if (error || options.error)
    return (
      <Alert color="red" role="alert" title="Could not open the hazard form">
        {error || options.error}
      </Alert>
    );
  if (!data || !options.data) return <Loader aria-label="Loading the hazard form" />;
  if (!data.can_edit)
    return (
      <Alert color="yellow" title="Read-only safety file">
        Only the safety file's verified owner may record or edit its hazards.
      </Alert>
    );
  if ("repository_missing" in data && data.repository_missing)
    return (
      <Alert color="red" role="alert">
        The repository is missing. Ask an administrator to restore it before editing.
      </Alert>
    );
  if (!data.head_sha)
    return (
      <Alert color="red" role="alert">
        The repository version could not be read. No save is available.
      </Alert>
    );
  return (
    <HazardForm
      key={`${slug}:${hazardId ?? "new"}`}
      file={data.safety_file}
      source={"hazard" in data ? data.hazard : null}
      head={data.head_sha}
      options={options.data}
    />
  );
}

function AssessmentPreview({
  severity,
  likelihood,
  label,
}: {
  severity: number;
  likelihood: number;
  label: string;
}) {
  const { data, error } = useApiResource<Assessment>(
    `/assessment-preview/?severity=${severity}&likelihood=${likelihood}`,
  );
  if (error)
    return (
      <Alert color="red" role="alert" title="Risk preview unavailable">
        {error} Saving will still be validated by the storage layer.
      </Alert>
    );
  if (!data)
    return (
      <Text role="status" size="sm">
        Calculating the risk preview…
      </Text>
    );
  return (
    <Box>
      <Text size="sm" c="dimmed">
        Derived risk preview - not saved
      </Text>
      <RiskLevel assessment={data} label={label} />
    </Box>
  );
}

function HazardForm({
  file,
  source,
  head,
  options,
}: {
  file: SafetyFile;
  source: Hazard | null;
  head: string;
  options: HazardOptions;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, submitting, failure } = useSubmission();
  const form = useForm({
    initialValues: {
      title: source?.title ?? "",
      owner: source?.owner ?? user?.email ?? "",
      status: source?.status ?? "open",
      cause: source?.cause ?? "",
      effect: source?.effect ?? "",
      harm: source?.harm ?? "",
      justification: source?.justification ?? "",
      body: source?.body ?? "",
      initial: {
        severity: source?.initial.severity ?? 0,
        likelihood: source?.initial.likelihood ?? 0,
      },
      residual: {
        severity: source?.residual.severity ?? 0,
        likelihood: source?.residual.likelihood ?? 0,
      },
    },
  });
  const latest = source
    ? `/safety-files/${file.slug}/hazards/${source.id}`
    : `/safety-files/${file.slug}`;
  return (
    <Box maw={800}>
      <Anchor component={Link} to={latest}>
        Back to {source?.id ?? file.name}
      </Anchor>
      <Title order={1} size="h2" mt="md" mb="sm">
        {source ? `Edit ${source.id}` : "Record a hazard"}
      </Title>
      <Text mb="md">
        {file.name}. Save the whole form to record one attributable version and update the
        hazard log. Do not enter patient data.
      </Text>
      <SaveFailure message={failure} />
      {failure && (
        <Anchor href={latest} target="_blank" rel="noopener noreferrer" display="block" mb="md">
          Open the latest recorded version in another tab without losing this draft
        </Anchor>
      )}
      <form
        noValidate
        onSubmit={form.onSubmit((values) =>
          run(async () => {
            const path = `/safety-files/${file.slug}/hazards/${source ? `${source.id}/` : ""}`;
            const payload = { ...values, expected_head: head };
            const saved = source
              ? await api.patch<{ hazard: Hazard }>(path, payload)
              : await api.post<{ hazard: Hazard }>(path, payload);
            void navigate(`/safety-files/${file.slug}/hazards/${saved.hazard.id}`);
          }, form.setErrors),
        )}
      >
        <Stack gap="lg">
          <TextInput
            label="Hazard title"
            required
            maxLength={200}
            {...form.getInputProps("title")}
          />
          <TextInput
            label="Responsible email address"
            type="email"
            required
            description="This records responsibility. It does not invite anyone or grant access."
            {...form.getInputProps("owner")}
          />
          <NativeSelect
            label="Hazard status"
            data={options.statuses.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            {...form.getInputProps("status")}
          />
          {form.values.status !== "open" && (
            <Alert color="yellow" title="Closing or transferring does not reduce risk">
              The assessment and history remain. Closing needs a reason; transferring does not
              record acceptance by another organisation.
            </Alert>
          )}
          <Textarea
            label="Cause"
            required
            minRows={3}
            autosize
            description="What could cause this hazard?"
            {...form.getInputProps("cause")}
          />
          <Textarea
            label="Effect on the care pathway"
            required
            minRows={3}
            autosize
            description="What happens to the care process?"
            {...form.getInputProps("effect")}
          />
          <Textarea
            label="Potential harm"
            required
            minRows={3}
            autosize
            description="What harm could follow for a patient or other person?"
            {...form.getInputProps("harm")}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {(["initial", "residual"] as const).map((stage) => (
              <Fieldset
                key={stage}
                legend={stage === "initial" ? "Initial assessment" : "Residual assessment"}
              >
                <Stack>
                  {(["severity", "likelihood"] as const).map((score) => (
                    <NativeSelect
                      key={score}
                      label={`${score === "severity" ? "Severity" : "Likelihood"} - ${stage}`}
                      required
                      value={String(form.values[stage][score])}
                      onChange={(event) =>
                        form.setFieldValue(
                          `${stage}.${score}`,
                          Number(event.currentTarget.value),
                        )
                      }
                      error={form.errors[`${stage}.${score}`]}
                      data={[{ value: "0", label: "Select a score" }, ...options[score]]}
                    />
                  ))}
                  {form.values[stage].severity > 0 && form.values[stage].likelihood > 0 ? (
                    <AssessmentPreview
                      severity={form.values[stage].severity}
                      likelihood={form.values[stage].likelihood}
                      label={stage}
                    />
                  ) : (
                    <Text size="sm" c="dimmed">
                      Select both scores to see the derived risk. No low-risk value is assumed.
                    </Text>
                  )}
                </Stack>
              </Fieldset>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            Residual severity and likelihood cannot exceed the initial scores. Risk level is
            calculated on the server and cannot be entered.
          </Text>
          <Textarea
            label="Risk justification or closure reason"
            required={form.values.status === "closed"}
            minRows={3}
            autosize
            {...form.getInputProps("justification")}
          />
          <Textarea
            label="Additional narrative (Markdown)"
            minRows={5}
            autosize
            {...form.getInputProps("body")}
          />
          {source && (
            <Text size="sm">
              Linked mitigations are unchanged by this form:{" "}
              {source.mitigations.join(", ") || "none"}. Mitigation linking and delegated work
              are not yet available here.
            </Text>
          )}
          <Text size="sm">
            Opening version <code>{head.slice(0, 8)}</code>. If this file changes before you
            save, Turva rejects the stale form rather than overwriting newer evidence. Saving is
            not approval to deploy.
          </Text>
          <Button type="submit" loading={submitting} style={{ alignSelf: "flex-start" }}>
            Save hazard
          </Button>
          <Anchor component={Link} to={latest}>
            Discard this unsaved draft and return to the recorded version
          </Anchor>
        </Stack>
      </form>
    </Box>
  );
}
