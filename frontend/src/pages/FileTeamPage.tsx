import { Box, Group, Stack } from "@mantine/core";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { api } from "../api/client";
import type { FileTeamDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSession } from "../auth/useSession";
import { FieldsetCard } from "../components/base-card";
import { SecondaryButton } from "../components/button";
import { CheckboxField, SelectField, TextAreaField } from "../components/form";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { GuidanceNote, StateMessage } from "../components/message-cards";
import { BodyText, ExternalTextLink, PageHeader } from "../components/typography";
import { usePageSublink } from "../components/navigation";
import { apiFailure } from "../lib/forms";

type Recorded = NonNullable<FileTeamDetail["team"]>;
type Person = Recorded["accountable"];

type TeamValues = {
  organisation_id: string;
  accountable_id: string;
  collaborator_ids: string[];
  reason: string;
};

const FIELDS = ["organisation_id", "accountable_id", "collaborator_ids", "reason"] as const;

export function FileTeamPage() {
  const { slug } = useParams();
  const { data, error } = useApiResource<FileTeamDetail>(
    `/safety-files/${slug}/team/`,
    "That file team does not exist, or you do not have access to it.",
  );

  if (error) {
    return (
      <Stack maw={900}>
        <PageHeader title="File team" />
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="Could not load the file team"
            description={error}
          />
        </Box>
      </Stack>
    );
  }
  if (!data) return <PageSpinner label="Loading the file team" />;

  return <FileTeam key={slug} detail={data} />;
}

function TeamFields({
  detail,
  recorded,
}: {
  detail: FileTeamDetail;
  recorded: Recorded | null;
}) {
  const navigate = useNavigate();
  const { user } = useSession();
  const { methods } = useFormContext<TeamValues>();
  const { errors } = methods.formState;
  const values = methods.watch();
  const organisation = detail.choices.find((choice) => choice.id === values.organisation_id);
  const accountable = organisation?.csos.find((member) => member.id === values.accountable_id);

  return (
    <Stack gap="lg">
      <Controller
        control={methods.control}
        name="organisation_id"
        render={({ field }) => (
          <SelectField
            label="Organisation for this file"
            placeholder="Select an organisation deliberately"
            description={
              organisation ? `${organisation.name} · reference ${organisation.id}` : undefined
            }
            required
            disabled={Boolean(recorded)}
            data={detail.choices.map((choice) => ({
              value: choice.id,
              label: `${choice.name} (${choice.id.slice(0, 8)})`,
            }))}
            value={field.value || null}
            onChange={(value) => {
              const id = value ?? "";
              const choice = detail.choices.find((candidate) => candidate.id === id);
              field.onChange(id);
              // Adopting names the person adopting as the first accountable
              // CSO, and a new organisation starts with no collaborators.
              methods.setValue(
                "accountable_id",
                choice?.csos.find((member) => member.user_id === user?.id)?.id ?? "",
                { shouldDirty: true },
              );
              methods.setValue("collaborator_ids", [], { shouldDirty: true });
            }}
            error={errors.organisation_id?.message}
          />
        )}
      />

      <Controller
        control={methods.control}
        name="accountable_id"
        render={({ field }) => (
          <SelectField
            label="One accountable CSO"
            placeholder="Select the accountable CSO"
            description={accountable ? `${accountable.name} (${accountable.email})` : undefined}
            required
            disabled={!recorded}
            data={(organisation?.csos ?? []).map((member) => ({
              value: member.id,
              label: `${member.name} (${member.email})`,
            }))}
            value={field.value || null}
            onChange={(value) => {
              const id = value ?? "";
              field.onChange(id);
              methods.setValue(
                "collaborator_ids",
                methods.getValues("collaborator_ids").filter((member) => member !== id),
                { shouldDirty: true },
              );
            }}
            error={errors.accountable_id?.message}
          />
        )}
      />

      <FieldsetCard
        legend="Explicitly named CSO collaborators"
        description="Every selected person can read and edit the whole file. Do not use this to delegate a single mitigation."
      >
        <Stack gap="md">
          <Controller
            control={methods.control}
            name="collaborator_ids"
            render={({ field }) => (
              <Stack gap="md">
                {(organisation?.csos ?? [])
                  .filter((member) => member.id !== values.accountable_id)
                  .map((member) => (
                    <CheckboxField
                      key={member.id}
                      label={member.name}
                      description={member.email}
                      checked={field.value.includes(member.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.currentTarget.checked
                            ? [...field.value, member.id]
                            : field.value.filter((id) => id !== member.id),
                        )
                      }
                    />
                  ))}
              </Stack>
            )}
          />
          {!organisation && (
            <BodyText>Select the organisation to see its currently appointed CSOs.</BodyText>
          )}
        </Stack>
      </FieldsetCard>

      <TextAreaField
        label="Reason for this team decision"
        required
        autosize
        minRows={3}
        maxLength={2000}
        {...methods.register("reason", { required: "Give a reason for this team decision" })}
        error={errors.reason?.message}
      />

      <GuidanceNote
        icon={<IconAlertTriangle />}
        colour="warning"
        title="A team change is not a clinical judgement"
        description="Saving names one accountable CSO and the selected collaborators. It does not change risk scores or verify anyone's registration. Replacing or removing a named CSO removes their private access; organisation administrators still cannot edit evidence unless explicitly named as appointed CSOs."
      />
      <BodyText>
        Opening version <code>{detail.head_sha.slice(0, 8)}</code>. Any other file save makes
        this draft stale. Nothing changes until you save.
      </BodyText>
      {/* Cancel goes back to the file this team belongs to; the form asks
          first if there are unsaved changes. */}
      <SubmitButton
        disabled={!values.organisation_id || !values.accountable_id}
        onCancel={() => void navigate(`/safety-files/${detail.slug}`)}
      />
    </Stack>
  );
}

function FileTeam({ detail }: { detail: FileTeamDetail }) {
  const navigate = useNavigate();
  const filePath = `/safety-files/${detail.slug}`;

  // The side bar shows where this page sits: the file beneath "Safety
  // files", and "File team" beneath the file.
  usePageSublink([
    { parent: "/safety-files", to: filePath, label: detail.file_name },
    { parent: filePath, to: `${filePath}/team`, label: "File team" },
  ]);

  const [refused, setRefused] = useState(false);
  const recorded = detail.team;
  const initialChoice = detail.choices.find(
    (choice) => choice.id === recorded?.organisation_id,
  );
  const current = (person: Person) =>
    initialChoice?.csos.some(
      (member) =>
        member.id === person.membership_id && member.appointment_id === person.appointment_id,
    ) ?? false;
  const expired =
    recorded !== null &&
    [recorded.accountable, ...recorded.collaborators].some((person) => !current(person));
  const path = `/safety-files/${detail.slug}`;

  async function save(values: TeamValues): Promise<FormSubmitResult<TeamValues>> {
    // The appointments as they were when this form opened, for the people
    // chosen. The server refuses the save if any has changed since.
    const organisation = detail.choices.find((choice) => choice.id === values.organisation_id);
    const selected = [values.accountable_id, ...values.collaborator_ids];
    const expected_appointments = Object.fromEntries(
      (organisation?.csos ?? [])
        .filter((member) => selected.includes(member.id))
        .map((member) => [member.id, member.appointment_id]),
    );

    setRefused(false);
    try {
      await api.put(`/safety-files/${detail.slug}/team/`, {
        ...values,
        expected_appointments,
        expected_head: detail.head_sha,
      });

      return { state: "success", message: { title: "File team saved" } };
    } catch (error) {
      setRefused(true);

      return apiFailure<TeamValues>(error, "Could not save the file team", FIELDS);
    }
  }

  return (
    <Box maw={900}>
      <Stack gap="lg">
        <PageHeader title={`File team: ${detail.file_name}`} />

        {recorded ? (
          <Stack gap="xs">
            <BodyText>Recorded organisation: {recorded.organisation_name}</BodyText>
            <BodyText>
              Accountable CSO: {recorded.accountable.name} ({recorded.accountable.email})
            </BodyText>
            <BodyText>
              CSO collaborators:{" "}
              {recorded.collaborators
                .map((person) => `${person.name} (${person.email})`)
                .join(", ") || "None named"}
            </BodyText>
            <BodyText c="dimmed">
              Recorded names are not proof of current appointment, competence or approval to
              deploy. Earlier narrative pages are not rewritten by a team change; review their
              personnel details separately.
            </BodyText>
          </Stack>
        ) : (
          <BodyText>
            This file is owner-controlled. Organisation names in the file or your profile grant
            no access. Adoption is an explicit, attributable change and names you as the first
            accountable CSO.
          </BodyText>
        )}

        {!detail.can_manage ? (
          <StateMessage
            icon={<IconAlertTriangle />}
            colour="warning"
            title="You cannot manage this team"
            description="Only the legacy owner, current accountable CSO or organisation administrator may manage the team."
          />
        ) : detail.choices.length === 0 ? (
          <StateMessage
            icon={<IconAlertTriangle />}
            colour="warning"
            title="No eligible organisation appointment"
            description="Ask an administrator to invite you and appoint you as a CSO after you complete your profile declaration. Nothing has changed; this file remains owner-controlled."
          />
        ) : (
          <Stack gap="md">
            {expired && (
              <StateMessage
                icon={<IconAlertTriangle />}
                colour="warning"
                title="Some recorded appointments are no longer current"
                description="Outdated appointments are not selected below. Reappointment does not restore file grants: deliberately select the current CSO appointments and save a new team decision."
              />
            )}
            {refused && (
              <ExternalTextLink href={`${path}/team`}>
                Open the latest team in another tab without losing this draft
              </ExternalTextLink>
            )}
            <Form<TeamValues>
              defaultValues={{
                organisation_id: recorded?.organisation_id ?? "",
                accountable_id:
                  recorded && current(recorded.accountable)
                    ? recorded.accountable.membership_id
                    : "",
                collaborator_ids:
                  recorded?.collaborators
                    .filter(current)
                    .map((person) => person.membership_id) ?? [],
                reason: recorded?.reason ?? "",
              }}
              onSubmit={save}
              onSuccess={() => void navigate("/safety-files")}
              submitLabel={recorded ? "Save file team" : "Adopt file into this organisation"}
              submittingLabel="Saving…"
            >
              <Stack gap="lg">
                <FormStatus retainsDraft />
                <TeamFields detail={detail} recorded={recorded} />
              </Stack>
            </Form>
          </Stack>
        )}

        {/* With no form to cancel, the way back is to the file itself. */}
        {(!detail.can_manage || detail.choices.length === 0) && (
          <Group justify="flex-end">
            <SecondaryButton onClick={() => void navigate(filePath)}>
              Back to the safety file
            </SecondaryButton>
          </Group>
        )}
      </Stack>
    </Box>
  );
}
