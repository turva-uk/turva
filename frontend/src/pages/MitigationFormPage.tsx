import { Box, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { ApiError } from "../api/client";
import { useSession } from "../auth/useSession";
import type { Hazard, Mitigation, MitigationOptions, SafetyFile } from "../api/types";
import { FormStatus } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import MitigationForm from "../components/safety/MitigationForm";
import { BodyText, ExternalTextLink, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";
import {
  addMitigation,
  blankMitigation,
  getFile,
  getMitigation,
  mitigationOptions,
  updateMitigation,
  type MitigationInput,
} from "../lib/safety";

/** The fields the server may name in a refused save. */
const FIELDS: readonly FieldPath<MitigationInput>[] = [
  "title",
  "owner",
  "status",
  "control_type",
  "hazards",
  "evidence",
  "body",
];

/** What the form opens on: the file, the mitigation if editing, and the version read. */
interface Opened {
  file: SafetyFile;
  mitigation: Mitigation | null;
  hazards: Hazard[];
  head: string | null;
  canEdit: boolean;
  repositoryMissing: boolean;
}

export function MitigationFormPage({ editing = false }: { editing?: boolean }) {
  const { slug = "", mitigationId = "" } = useParams();
  const [query] = useSearchParams();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [options, setOptions] = useState<MitigationOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fail = (reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof ApiError ? reason.message : "Something went wrong.");
    };

    const read = editing
      ? getMitigation(slug, mitigationId, controller.signal).then((detail) => ({
          file: detail.safety_file,
          mitigation: detail.mitigation,
          hazards: detail.hazards,
          head: detail.head_sha,
          canEdit: detail.can_edit,
          repositoryMissing: false,
        }))
      : getFile(slug, controller.signal).then((detail) => ({
          file: detail.safety_file,
          mitigation: null,
          hazards: detail.hazards ?? [],
          head: detail.head_sha ?? null,
          canEdit: detail.can_edit,
          repositoryMissing: detail.repository_missing,
        }));
    read.then(setOpened).catch(fail);
    mitigationOptions(controller.signal).then(setOptions).catch(fail);

    return () => controller.abort();
  }, [editing, slug, mitigationId]);

  if (error) {
    return (
      <Notice title="Could not open the mitigation form" description={error} colour="alert" />
    );
  }
  if (!opened || !options) return <PageSpinner label="Loading the mitigation form" />;
  if (!opened.canEdit) {
    return (
      <Notice
        title="Read-only safety file"
        description="Only a verified legacy owner or a currently appointed, named file CSO may edit mitigations."
        colour="warning"
      />
    );
  }
  if (opened.repositoryMissing || !opened.head) {
    return (
      <Notice
        title="The repository version could not be read"
        description="No save is available. Ask an administrator to inspect it."
        colour="alert"
      />
    );
  }

  return (
    <MitigationEditor
      key={`${slug}:${mitigationId || "new"}`}
      file={opened.file}
      source={opened.mitigation}
      hazards={opened.hazards}
      head={opened.head}
      options={options}
      initialHazard={query.get("hazard")}
    />
  );
}

/** A page-level notice, read out as the page opens when it is an alert. */
function Notice({
  title,
  description,
  colour,
}: {
  title: string;
  description: string;
  colour: "alert" | "warning";
}) {
  const card = (
    <StateMessage
      icon={colour === "alert" ? <IconAlertCircle /> : <IconAlertTriangle />}
      colour={colour}
      title={title}
      description={description}
    />
  );

  return (
    <Stack maw={800}>
      <PageHeader title="Mitigation" />
      {colour === "alert" ? <Box role="alert">{card}</Box> : card}
    </Stack>
  );
}

function MitigationEditor({
  file,
  source,
  hazards,
  head,
  options,
  initialHazard,
}: {
  file: SafetyFile;
  source: Mitigation | null;
  hazards: Hazard[];
  head: string;
  options: MitigationOptions;
  initialHazard: string | null;
}) {
  const navigate = useNavigate();
  const { user } = useSession();
  // A new mitigation names the person recording it as responsible, and,
  // when opened from a hazard, links that hazard, as this page always has.
  const [blank] = useState(() =>
    blankMitigation(
      user?.email ?? "",
      hazards.filter((hazard) => hazard.id === initialHazard).map((hazard) => hazard.id),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const latest = source
    ? `/safety-files/${file.slug}/mitigations/${source.id}`
    : `/safety-files/${file.slug}`;

  async function save(input: MitigationInput) {
    // The version this form opened goes with every save, retries included.
    // A newer version is never fetched to make a stale judgement save.
    setSaving(true);
    setFailure(null);
    setFieldErrors({});
    try {
      const saved = source
        ? await updateMitigation(file.slug, source.id, input, head)
        : await addMitigation(file.slug, input, head);
      void navigate(`/safety-files/${file.slug}/mitigations/${saved.mitigation.id}`);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFailure("Something went wrong. Nothing was saved; try again.");
        return;
      }
      const result = apiFailure<MitigationInput>(
        error,
        "Could not save the mitigation",
        FIELDS,
      );
      setFailure(
        typeof result.message.description === "string" && result.message.description
          ? result.message.description
          : "Nothing was saved.",
      );
      setFieldErrors(result.fieldErrors ?? {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box maw={800}>
      <Stack gap="lg">
        <TextLink to={latest} standalone>
          Back to {source?.id ?? file.name}
        </TextLink>
        <PageHeader title={source ? `Edit ${source.id}` : "Record a mitigation"} />
        <BodyText>
          {file.name}. Save the whole form to record the evidence and both sides of its hazard
          links in one attributable version. Do not enter patient data.
        </BodyText>

        {failure && (
          <Stack gap="xs">
            <FormStatus
              variant="error"
              title="Could not save the mitigation"
              description={failure}
              retainsDraft
            />
            <ExternalTextLink href={latest}>
              Open the latest recorded version in another tab without losing this draft
            </ExternalTextLink>
          </Stack>
        )}

        <BodyText>
          Opening version <code>{head.slice(0, 8)}</code>. A save elsewhere in this safety file
          makes this form stale. Nothing saves until you choose Save mitigation.
        </BodyText>

        <MitigationForm
          initial={source ?? blank}
          hazards={hazards}
          options={options}
          onSubmit={(input) => void save(input)}
          onCancel={() => void navigate(latest)}
          cancelLabel="Discard draft"
          saving={saving}
          fieldErrors={fieldErrors}
        />
      </Stack>
    </Box>
  );
}
