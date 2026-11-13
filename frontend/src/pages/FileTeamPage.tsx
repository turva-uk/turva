import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Fieldset,
  Loader,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router";

import { api } from "../api/client";
import type { FileTeamDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function FileTeamPage() {
  const { slug } = useParams();
  const { data, error } = useApiResource<FileTeamDetail>(
    `/safety-files/${slug}/team/`,
    "That file team does not exist, or you do not have access to it.",
  );
  if (error)
    return (
      <Alert color="red" role="alert" title="Could not load the file team">
        {error}
      </Alert>
    );
  if (!data) return <Loader aria-label="Loading the file team" />;
  return <FileTeamForm key={slug} detail={data} />;
}

function FileTeamForm({ detail }: { detail: FileTeamDetail }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, failure, submitting } = useSubmission();
  const recorded = detail.team;
  const initialChoice = detail.choices.find((value) => value.id === recorded?.organisation_id);
  const current = (person: NonNullable<FileTeamDetail["team"]>["accountable"]) =>
    initialChoice?.csos.some(
      (member) =>
        member.id === person.membership_id && member.appointment_id === person.appointment_id,
    );
  const form = useForm({
    initialValues: {
      organisation_id: recorded?.organisation_id ?? "",
      accountable_id:
        recorded && current(recorded.accountable) ? recorded.accountable.membership_id : "",
      collaborator_ids:
        recorded?.collaborators.filter(current).map((person) => person.membership_id) ?? [],
      reason: recorded?.reason ?? "",
    },
  });
  const organisation = detail.choices.find((value) => value.id === form.values.organisation_id);
  const accountable = organisation?.csos.find(
    (member) => member.id === form.values.accountable_id,
  );
  const expired =
    recorded &&
    [recorded.accountable, ...recorded.collaborators].some((person) => !current(person));
  const path = `/safety-files/${detail.slug}`;
  return (
    <Box maw={900}>
      <Anchor component={Link} to="/organisations">
        Your organisations
      </Anchor>
      <Title order={1} size="h2" mt="md" mb="sm">
        File team: {detail.file_name}
      </Title>
      {recorded ? (
        <Box mb="lg">
          <Text>Recorded organisation: {recorded.organisation_name}</Text>
          <Text>
            Accountable CSO: {recorded.accountable.name} ({recorded.accountable.email})
          </Text>
          <Text>
            CSO collaborators:{" "}
            {recorded.collaborators
              .map((person) => `${person.name} (${person.email})`)
              .join(", ") || "None named"}
          </Text>
          <Text size="sm" c="dimmed">
            Recorded names are not proof of current appointment, competence or approval to
            deploy. Earlier narrative pages are not rewritten by a team change; review their
            personnel details separately.
          </Text>
        </Box>
      ) : (
        <Text mb="lg">
          This file is owner-controlled. Organisation names in the file or your profile grant no
          access. Adoption is an explicit, attributable change and names you as the first
          accountable CSO.
        </Text>
      )}
      {!detail.can_manage ? (
        <Alert color="yellow">
          Only the legacy owner, current accountable CSO or organisation administrator may
          manage the team.
        </Alert>
      ) : detail.choices.length === 0 ? (
        <Alert color="yellow" title="No eligible organisation appointment">
          Ask an administrator to invite you and appoint you as a CSO after you complete your
          profile declaration. Nothing has changed; this file remains owner-controlled.
        </Alert>
      ) : (
        <>
          {expired && (
            <Alert
              color="yellow"
              mb="md"
              title="Some recorded appointments are no longer current"
            >
              Outdated appointments are not selected below. Reappointment does not restore file
              grants: deliberately select the current CSO appointments and save a new team
              decision.
            </Alert>
          )}
          <SaveFailure message={failure} title="Could not save the file team" />
          {failure && (
            <Anchor
              href={`${path}/team`}
              target="_blank"
              rel="noopener noreferrer"
              display="block"
              mb="md"
            >
              Open the latest team in another tab without losing this draft
            </Anchor>
          )}
          <form
            className="governance-form"
            onSubmit={form.onSubmit((values) =>
              run(async () => {
                const selected = [values.accountable_id, ...values.collaborator_ids];
                const expected_appointments = Object.fromEntries(
                  (organisation?.csos ?? [])
                    .filter((member) => selected.includes(member.id))
                    .map((member) => [member.id, member.appointment_id]),
                );
                await api.put(`/safety-files/${detail.slug}/team/`, {
                  ...values,
                  expected_appointments,
                  expected_head: detail.head_sha,
                });
                void navigate("/safety-files");
              }, form.setErrors),
            )}
          >
            <Stack gap="lg">
              <NativeSelect
                label="Organisation for this file"
                description={
                  organisation
                    ? `${organisation.name} · reference ${organisation.id}`
                    : undefined
                }
                required
                disabled={Boolean(recorded)}
                data={[
                  { value: "", label: "Select an organisation deliberately" },
                  ...detail.choices.map((choice) => ({
                    value: choice.id,
                    label: `${choice.name} (${choice.id.slice(0, 8)})`,
                  })),
                ]}
                {...form.getInputProps("organisation_id")}
                onChange={(event) => {
                  const choice = detail.choices.find(
                    (value) => value.id === event.currentTarget.value,
                  );
                  form.setFieldValue("organisation_id", event.currentTarget.value);
                  form.setFieldValue(
                    "accountable_id",
                    choice?.csos.find((member) => member.user_id === user?.id)?.id ?? "",
                  );
                  form.setFieldValue("collaborator_ids", []);
                }}
              />
              <NativeSelect
                label="One accountable CSO"
                description={
                  accountable ? `${accountable.name} (${accountable.email})` : undefined
                }
                required
                disabled={!recorded}
                data={[
                  { value: "", label: "Select the accountable CSO" },
                  ...(organisation?.csos ?? []).map((member) => ({
                    value: member.id,
                    label: `${member.name} (${member.email})`,
                  })),
                ]}
                {...form.getInputProps("accountable_id")}
                onChange={(event) => {
                  form.setFieldValue("accountable_id", event.currentTarget.value);
                  form.setFieldValue(
                    "collaborator_ids",
                    form.values.collaborator_ids.filter(
                      (value) => value !== event.currentTarget.value,
                    ),
                  );
                }}
              />
              <Fieldset legend="Explicitly named CSO collaborators">
                <Text size="sm" mb="md">
                  Every selected person can read and edit the whole file. Do not use this to
                  delegate a single mitigation.
                </Text>
                {(organisation?.csos ?? [])
                  .filter((member) => member.id !== form.values.accountable_id)
                  .map((member) => (
                    <Checkbox
                      key={member.id}
                      mb="md"
                      label={`${member.name} (${member.email})`}
                      checked={form.values.collaborator_ids.includes(member.id)}
                      onChange={(event) =>
                        form.setFieldValue(
                          "collaborator_ids",
                          event.currentTarget.checked
                            ? [...form.values.collaborator_ids, member.id]
                            : form.values.collaborator_ids.filter(
                                (value) => value !== member.id,
                              ),
                        )
                      }
                    />
                  ))}
                {!organisation && (
                  <Text>Select the organisation to see its currently appointed CSOs.</Text>
                )}
              </Fieldset>
              <Textarea
                label="Reason for this team decision"
                required
                autosize
                minRows={3}
                maxLength={2000}
                {...form.getInputProps("reason")}
              />
              <Alert color="yellow" title="A team change is not a clinical judgement">
                Saving names one accountable CSO and the selected collaborators. It does not
                change risk scores or verify anyone's registration. Replacing or removing a
                named CSO removes their private access; organisation administrators still cannot
                edit evidence unless explicitly named as appointed CSOs.
              </Alert>
              <Text size="sm">
                Opening version <code>{detail.head_sha.slice(0, 8)}</code>. Any other file save
                makes this draft stale. Nothing changes until you save.
              </Text>
              <Button
                type="submit"
                loading={submitting}
                disabled={!form.values.organisation_id || !form.values.accountable_id}
                style={{ alignSelf: "flex-start" }}
              >
                {recorded ? "Save file team" : "Adopt file into this organisation"}
              </Button>
            </Stack>
          </form>
        </>
      )}
      <Anchor component={Link} to="/safety-files" display="block" mt="lg">
        Cancel and return to your safety files
      </Anchor>
    </Box>
  );
}
