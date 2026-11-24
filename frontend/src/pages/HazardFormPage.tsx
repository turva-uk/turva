import { Box, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "../api/client";
import { useSession } from "../auth/useSession";
import type { Hazard, HazardOptions, SafetyFile } from "../api/types";
import { FormStatus } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import HazardForm from "../components/safety/HazardForm";
import { BodyText, ExternalTextLink, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";
import {
  addHazard,
  blankHazard,
  getFile,
  getHazard,
  hazardOptions,
  updateHazard,
  type HazardInput,
} from "../lib/safety";

/** The fields the server may name in a refused save. */
const FIELDS: readonly FieldPath<HazardInput>[] = [
  "title",
  "owner",
  "status",
  "cause",
  "effect",
  "harm",
  "justification",
  "body",
  "initial.severity",
  "initial.likelihood",
  "residual.severity",
  "residual.likelihood",
];

/** What the form opens on: the file, the hazard if editing, and the version read. */
interface Opened {
  file: SafetyFile;
  hazard: Hazard | null;
  head: string | null;
  canEdit: boolean;
  repositoryMissing: boolean;
}

export function HazardFormPage({ editing = false }: { editing?: boolean }) {
  const { slug = "", hazardId = "" } = useParams();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [options, setOptions] = useState<HazardOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fail = (reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof ApiError ? reason.message : "Something went wrong.");
    };

    const read = editing
      ? getHazard(slug, hazardId, controller.signal).then((detail) => ({
          file: detail.safety_file,
          hazard: detail.hazard,
          head: detail.head_sha,
          canEdit: detail.can_edit,
          repositoryMissing: false,
        }))
      : getFile(slug, controller.signal).then((detail) => ({
          file: detail.safety_file,
          hazard: null,
          head: detail.head_sha ?? null,
          canEdit: detail.can_edit,
          repositoryMissing: detail.repository_missing,
        }));
    read.then(setOpened).catch(fail);
    hazardOptions(controller.signal).then(setOptions).catch(fail);

    return () => controller.abort();
  }, [editing, slug, hazardId]);

  if (error) {
    return <Notice title="Could not open the hazard form" description={error} colour="alert" />;
  }
  if (!opened || !options) return <PageSpinner label="Loading the hazard form" />;
  if (!opened.canEdit) {
    return (
      <Notice
        title="Read-only safety file"
        description="Only a verified legacy owner or a currently appointed, named file CSO may edit hazards."
        colour="warning"
      />
    );
  }
  if (opened.repositoryMissing) {
    return (
      <Notice
        title="The repository is missing"
        description="Ask an administrator to restore it before editing."
        colour="alert"
      />
    );
  }
  if (!opened.head) {
    return (
      <Notice
        title="The repository version could not be read"
        description="No save is available."
        colour="alert"
      />
    );
  }

  return (
    <HazardEditor
      key={`${slug}:${hazardId || "new"}`}
      file={opened.file}
      source={opened.hazard}
      head={opened.head}
      options={options}
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
      <PageHeader title="Hazard" />
      {colour === "alert" ? <Box role="alert">{card}</Box> : card}
    </Stack>
  );
}

function HazardEditor({
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
  const navigate = useNavigate();
  const { user } = useSession();
  // A new hazard names the person recording it as responsible, until they
  // change it, as this page always has.
  const [blank] = useState(() => ({ ...blankHazard(), owner: user?.email ?? "" }));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const latest = source
    ? `/safety-files/${file.slug}/hazards/${source.id}`
    : `/safety-files/${file.slug}`;

  async function save(input: HazardInput) {
    // The version this form opened goes with every save, retries included.
    // A newer version is never fetched to make a stale judgement save.
    setSaving(true);
    setFailure(null);
    setFieldErrors({});
    try {
      const saved = source
        ? await updateHazard(file.slug, source.id, input, head)
        : await addHazard(file.slug, input, head);
      void navigate(`/safety-files/${file.slug}/hazards/${saved.hazard.id}`);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFailure("Something went wrong. Nothing was saved; try again.");
        return;
      }
      const result = apiFailure<HazardInput>(error, "Could not save the hazard", FIELDS);
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
        <PageHeader title={source ? `Edit ${source.id}` : "Record a hazard"} />
        <BodyText>
          {file.name}. Save the whole form to record one attributable version and update the
          hazard log. Do not enter patient data.
        </BodyText>

        {failure && (
          <Stack gap="xs">
            <FormStatus
              variant="error"
              title="Could not save the hazard"
              description={failure}
              retainsDraft
            />
            <ExternalTextLink href={latest}>
              Open the latest recorded version in another tab without losing this draft
            </ExternalTextLink>
          </Stack>
        )}

        {source && (
          <BodyText>
            Linked mitigations are unchanged by this form:{" "}
            {source.mitigations.join(", ") || "none"}. Use the mitigation form to change links;
            this hazard form preserves them.
          </BodyText>
        )}
        <BodyText>
          Opening version <code>{head.slice(0, 8)}</code>. If this file changes before you save,
          Turva rejects the stale form rather than overwriting newer evidence. Saving is not
          approval to deploy.
        </BodyText>

        <HazardForm
          initial={source ?? blank}
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
