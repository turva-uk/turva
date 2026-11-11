import {
  Alert,
  Anchor,
  Box,
  Button,
  Loader,
  MultiSelect,
  NativeSelect,
  Pill,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { api } from "../api/client";
import type {
  Hazard,
  Mitigation,
  MitigationDetail,
  MitigationOptions,
  SafetyFile,
  SafetyFileDetail,
} from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function MitigationFormPage({ editing = false }: { editing?: boolean }) {
  const { slug, mitigationId } = useParams();
  const [query] = useSearchParams();
  const path = editing
    ? `/safety-files/${slug}/mitigations/${mitigationId}/`
    : `/safety-files/${slug}/`;
  const { data, error } = useApiResource<SafetyFileDetail | MitigationDetail>(path);
  const options = useApiResource<MitigationOptions>("/mitigation-options/");
  if (error || options.error)
    return (
      <Alert color="red" role="alert" title="Could not open the mitigation form">
        {error || options.error}
      </Alert>
    );
  if (!data || !options.data) return <Loader aria-label="Loading the mitigation form" />;
  if (!data.can_edit)
    return (
      <Alert color="yellow" title="Read-only safety file">
        Only the safety file's verified owner may record or edit its mitigations.
      </Alert>
    );
  if (("repository_missing" in data && data.repository_missing) || !data.head_sha)
    return (
      <Alert color="red" role="alert">
        The repository version could not be read. No save is available. Ask an administrator to
        inspect it.
      </Alert>
    );
  return (
    <MitigationForm
      key={`${slug}:${mitigationId ?? "new"}`}
      file={data.safety_file}
      source={"mitigation" in data ? data.mitigation : null}
      head={data.head_sha}
      hazards={data.hazards ?? []}
      options={options.data}
      initialHazard={query.get("hazard")}
    />
  );
}

function MitigationForm({
  file,
  source,
  head,
  hazards,
  options,
  initialHazard,
}: {
  file: SafetyFile;
  source: Mitigation | null;
  head: string;
  hazards: Hazard[];
  options: MitigationOptions;
  initialHazard: string | null;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, submitting, failure } = useSubmission();
  const form = useForm({
    initialValues: {
      title: source?.title ?? "",
      owner: source?.owner ?? user?.email ?? "",
      status: source?.status ?? "proposed",
      control_type: source?.control_type ?? "",
      hazards:
        source?.hazards ??
        hazards.filter((hazard) => hazard.id === initialHazard).map((hazard) => hazard.id),
      evidence: source?.evidence ?? "",
      body: source?.body ?? "",
    },
  });
  const latest = source
    ? `/safety-files/${file.slug}/mitigations/${source.id}`
    : `/safety-files/${file.slug}`;
  return (
    <Box maw={800}>
      <Anchor component={Link} to={latest}>
        Back to {source?.id ?? file.name}
      </Anchor>
      <Title order={1} size="h2" mt="md" mb="sm">
        {source ? `Edit ${source.id}` : "Record a mitigation"}
      </Title>
      <Text mb="md">
        {file.name}. Save the whole form to record the evidence and both sides of its hazard
        links in one attributable version. Do not enter patient data.
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
            const path = `/safety-files/${file.slug}/mitigations/${source ? `${source.id}/` : ""}`;
            const payload = { ...values, expected_head: head };
            const saved = source
              ? await api.patch<{ mitigation: Mitigation }>(path, payload)
              : await api.post<{ mitigation: Mitigation }>(path, payload);
            void navigate(`/safety-files/${file.slug}/mitigations/${saved.mitigation.id}`);
          }, form.setErrors),
        )}
      >
        <Stack gap="lg">
          <TextInput
            label="Mitigation title"
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
            label="Control type"
            required
            data={[
              { value: "", label: "Select a control type" },
              ...options.control_types.map((value) => ({
                value,
                label: value.charAt(0).toUpperCase() + value.slice(1),
              })),
            ]}
            {...form.getInputProps("control_type")}
          />
          <Text size="sm" c="dimmed">
            Controls are listed strongest first: elimination, technical, warning, then
            procedural.
          </Text>
          <NativeSelect
            label="Mitigation status"
            data={options.statuses.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            {...form.getInputProps("status")}
          />
          <MultiSelect
            label="Linked hazards"
            description="Adding or removing a link updates both records. It does not change the hazard's assessment."
            data={hazards.map((hazard) => ({
              value: hazard.id,
              label: `${hazard.id}: ${hazard.title}`,
            }))}
            searchable
            nothingFoundMessage="No hazards match"
            renderPill={({ option, onRemove, disabled }) => (
              <Pill
                withRemoveButton
                onRemove={onRemove}
                disabled={disabled}
                removeButtonProps={{
                  "aria-label": `Remove ${String(option.value)} from linked hazards`,
                  "aria-hidden": false,
                  tabIndex: 0,
                }}
                styles={{
                  root: {
                    height: "auto",
                    width: "100%",
                    maxWidth: "100%",
                    flex: "0 0 100%",
                    alignItems: "flex-start",
                  },
                  label: {
                    minWidth: 0,
                    flex: "1 1 0%",
                    whiteSpace: "normal",
                    overflow: "visible",
                    lineHeight: 1.5,
                    paddingBlock: 8,
                  },
                  remove: { height: 44, minWidth: 44, flexShrink: 0, alignSelf: "center" },
                }}
              >
                {option.label}
              </Pill>
            )}
            {...form.getInputProps("hazards")}
          />
          <Textarea
            label="Implementation and verification evidence"
            required={["implemented", "verified"].includes(form.values.status)}
            description="Record what demonstrates the control is in place and effective: a test, report, date or document reference. Proposed controls are not evidence of risk reduction."
            autosize
            minRows={4}
            {...form.getInputProps("evidence")}
          />
          <Textarea
            label="Additional narrative (Markdown)"
            autosize
            minRows={5}
            {...form.getInputProps("body")}
          />
          <Alert color="yellow" title="Mitigation status does not change risk">
            Linking, implementing, verifying or withdrawing a mitigation never changes a
            hazard's severity or likelihood automatically. Review the assessment separately. A
            recorded verification is the author's judgement, not certification by Turva.
          </Alert>
          <Text size="sm">
            Opening version <code>{head.slice(0, 8)}</code>. A save elsewhere in this safety
            file makes this form stale. Nothing saves until you choose Save mitigation.
          </Text>
          <Button type="submit" loading={submitting} style={{ alignSelf: "flex-start" }}>
            Save mitigation
          </Button>
          <Anchor component={Link} to={latest}>
            Discard this unsaved draft and return to the recorded version
          </Anchor>
        </Stack>
      </form>
    </Box>
  );
}
