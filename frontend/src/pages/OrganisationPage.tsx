import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { api } from "../api/client";
import type {
  OrganisationDetail,
  OrganisationInvitation,
  OrganisationMember,
} from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSubmission } from "../api/useSubmission";
import { SaveFailure } from "../components/SaveFailure";

export function OrganisationPage() {
  const { organisationId } = useParams();
  const { data, error } = useApiResource<OrganisationDetail>(
    `/organisations/${organisationId}/`,
    "That organisation does not exist, or you are not an active member.",
  );
  if (error)
    return (
      <Alert color="red" role="alert" title="Could not load that organisation">
        {error}
      </Alert>
    );
  if (!data) return <Loader aria-label="Loading the organisation" />;
  return <Organisation key={data.id} initial={data} />;
}

function Organisation({ initial }: { initial: OrganisationDetail }) {
  const [data, setData] = useState(initial);
  const [refreshFailed, setRefreshFailed] = useState(false);
  async function reload() {
    try {
      setData(await api.get<OrganisationDetail>(`/organisations/${data.id}/`));
      setRefreshFailed(false);
    } catch {
      // The write has already succeeded. A failed follow-up read must not
      // masquerade as a failed save or silently discard other role drafts.
      setRefreshFailed(true);
    }
  }
  return (
    <Box maw={1000}>
      <Anchor component={Link} to="/organisations">
        Back to your organisations
      </Anchor>
      <Title order={1} size="h2" mt="md" mb="sm">
        {data.name}
      </Title>
      <Text size="xs" c="dimmed" mb="md">
        Organisation reference: {data.id}
      </Text>
      {refreshFailed && (
        <Alert color="yellow" role="alert" mb="md" title="Change recorded; view not refreshed">
          The change was recorded, but Turva could not reload this organisation. These forms may
          now be stale. Do not repeat the save blindly.
          <Anchor
            href={`/organisations/${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
            display="block"
          >
            Open the latest organisation in another tab without losing other unsaved role
            changes
          </Anchor>
        </Alert>
      )}
      <Text mb="lg">
        Administration manages membership and CSO appointments. Only currently appointed CSOs
        named on a file may edit its safety evidence.
      </Text>
      <Title order={2} size="h3" mb="sm">
        Members and appointments
      </Title>
      {data.membership.is_administrator ? (
        <Stack>
          <Alert color="yellow" title="Appointment is not professional verification">
            Check competence through your organisation's own governance. Turva requires the
            person's verified email and profile declaration, but does not check the public
            register. Removing membership or a CSO appointment revokes private file access;
            reappointment does not restore old file grants.
          </Alert>
          {data.members.map((member) => (
            <MemberRoles
              key={`${member.id}:${member.revision}`}
              member={member}
              organisationId={data.id}
              onSaved={reload}
            />
          ))}
          <InviteForm organisationId={data.id} onSaved={reload} />
          <Title order={2} size="h3" mt="lg">
            Recent invitations
          </Title>
          {data.invitations?.length ? (
            data.invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                organisationId={data.id}
                onSaved={reload}
              />
            ))
          ) : (
            <Text>No invitations recorded.</Text>
          )}
          <Title order={2} size="h3" mt="lg">
            File-team administration
          </Title>
          <Text size="sm">
            This inventory lets administrators manage named teams, not read hazards or make
            safety judgements. Owners must explicitly adopt legacy files before they appear
            here.
          </Text>
          {data.files?.length ? (
            <ul>
              {data.files.map((file) => (
                <li key={file.slug}>
                  <Anchor component={Link} to={`/safety-files/${file.slug}/team`}>
                    Manage file team: {file.name}
                  </Anchor>
                </li>
              ))}
            </ul>
          ) : (
            <Text>No files have been adopted into this organisation.</Text>
          )}
          <Title order={2} size="h3" mt="lg">
            Recent administration history
          </Title>
          <Text size="sm">
            Operational history, not the safety evidence audit trail. File-team decisions and
            clinical changes are attributed in each file's Git history.
          </Text>
          <Table className="responsive-table" striped>
            <Table.Caption>Up to 100 recent organisation administration events</Table.Caption>
            <Table.Thead>
              <Table.Tr>
                {["When", "Action", "Subject", "By"].map((label) => (
                  <Table.Th key={label}>{label}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.events?.map((event, index) => (
                <Table.Tr key={`${event.created_at}:${index}`}>
                  <Table.Td data-label="When">
                    {new Date(event.created_at).toLocaleString("en-GB")}
                  </Table.Td>
                  <Table.Td data-label="Action">{event.action}</Table.Td>
                  <Table.Td data-label="Subject">{event.subject}</Table.Td>
                  <Table.Td data-label="By">{event.actor__email}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      ) : (
        <Table striped className="responsive-table">
          <Table.Caption>Active members of this organisation</Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Person</Table.Th>
              <Table.Th>Administration</Table.Th>
              <Table.Th>CSO appointment</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.members.map((member) => (
              <Table.Tr key={member.id}>
                <Table.Td data-label="Person">
                  {member.name}
                  <Text size="sm">{member.email}</Text>
                </Table.Td>
                <Table.Td data-label="Administration">
                  {member.is_administrator ? "Administrator" : "Member"}
                </Table.Td>
                <Table.Td data-label="CSO appointment">
                  {member.eligible_cso
                    ? "Appointed (not professional verification)"
                    : member.is_cso
                      ? "Appointment needs review"
                      : "Not appointed"}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}

function MemberRoles({
  member,
  organisationId,
  onSaved,
}: {
  member: OrganisationMember;
  organisationId: string;
  onSaved: () => Promise<void>;
}) {
  const { run, failure, submitting } = useSubmission();
  const [confirmed, setConfirmed] = useState(false);
  const form = useForm({
    initialValues: {
      active: member.active,
      is_administrator: member.is_administrator,
      is_cso: member.is_cso,
    },
  });
  const removing =
    (member.active && !form.values.active) ||
    (member.is_cso && !form.values.is_cso) ||
    (member.is_administrator && !form.values.is_administrator);
  return (
    <Fieldset legend={`${member.name} (${member.email})`}>
      <Text size="sm" mb="md">
        {member.active
          ? member.eligible_cso
            ? "Current CSO appointment. Professional competence is not verified by Turva."
            : member.is_cso
              ? "The recorded CSO appointment is no longer eligible. Check the profile declaration and explicitly reappoint if appropriate."
              : "No CSO appointment."
          : "Membership removed. Send a new invitation to rejoin."}
      </Text>
      <SaveFailure message={failure} title="Could not save membership" />
      <form
        className="governance-form"
        onSubmit={form.onSubmit((values) =>
          run(async () => {
            await api.patch(`/organisations/${organisationId}/members/${member.id}/`, {
              ...values,
              expected_revision: member.revision,
            });
            await onSaved();
          }, form.setErrors),
        )}
      >
        <Stack gap="md">
          <Checkbox
            label="Membership active"
            disabled={!member.active}
            {...form.getInputProps("active", { type: "checkbox" })}
            onChange={(event) => {
              const active = event.currentTarget.checked;
              form.setFieldValue("active", active);
              if (!active) {
                form.setFieldValue("is_administrator", false);
                form.setFieldValue("is_cso", false);
              }
              setConfirmed(false);
            }}
          />
          <Checkbox
            label="Organisation administrator"
            disabled={!form.values.active}
            {...form.getInputProps("is_administrator", { type: "checkbox" })}
          />
          <Checkbox
            label="Appointed Clinical Safety Officer"
            description="The person must first complete their own profile declaration."
            disabled={!form.values.active}
            {...form.getInputProps("is_cso", { type: "checkbox" })}
          />
          {removing && (
            <Checkbox
              label={`I understand these role changes for ${member.email}. Removing membership or a CSO appointment removes private file access; removing administrator status alone does not. Old CSO file grants will not return on reappointment.`}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.currentTarget.checked)}
            />
          )}
          <Button
            className="wrapping-button"
            type="submit"
            loading={submitting}
            disabled={!member.active || (removing && !confirmed)}
            style={{ alignSelf: "flex-start" }}
          >
            Save roles for {member.name}
          </Button>
        </Stack>
      </form>
    </Fieldset>
  );
}

function InviteForm({
  organisationId,
  onSaved,
}: {
  organisationId: string;
  onSaved: () => Promise<void>;
}) {
  const { run, submitting, failure } = useSubmission();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm({ initialValues: { email: "" } });
  return (
    <Box component="section" mt="lg">
      <Title order={2} size="h3" mb="sm">
        Invite a member
      </Title>
      <Text size="sm" mb="md">
        An invitation grants membership only after the recipient accepts using the same verified
        email address. It does not appoint a CSO or share a safety file.
      </Text>
      <SaveFailure message={failure} title="Could not invite this member" />
      {notice && (
        <Alert role="status" mb="md">
          {notice}
        </Alert>
      )}
      <form
        className="governance-form"
        onSubmit={form.onSubmit((values) =>
          run(async () => {
            const result = await api.post<{ email_sent: boolean }>(
              `/organisations/${organisationId}/invitations/`,
              values,
            );
            setNotice(
              result.email_sent
                ? "Invitation email sent. It expires in seven days."
                : "The invitation was recorded, but its email could not be sent. Check mail delivery and try again after ten minutes.",
            );
            if (result.email_sent) form.reset();
            await onSaved();
          }, form.setErrors),
        )}
      >
        <Stack>
          <TextInput
            label="Invitee's email address"
            type="email"
            required
            {...form.getInputProps("email")}
          />
          <Button type="submit" loading={submitting} style={{ alignSelf: "flex-start" }}>
            Send membership invitation
          </Button>
        </Stack>
      </form>
    </Box>
  );
}

function InvitationRow({
  invitation,
  organisationId,
  onSaved,
}: {
  invitation: OrganisationInvitation;
  organisationId: string;
  onSaved: () => Promise<void>;
}) {
  const { run, submitting, failure } = useSubmission();
  const [confirming, setConfirming] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const status = invitation.accepted_at
    ? "Accepted"
    : invitation.revoked_at
      ? "Revoked"
      : Date.parse(invitation.expires_at) <= openedAt
        ? "Expired"
        : "Pending";
  return (
    <Box>
      <Group justify="space-between">
        <Text>
          {invitation.email} · {status}
        </Text>
        {status === "Pending" && (
          <Button
            className="wrapping-button"
            variant="outline"
            color="red"
            onClick={() => setConfirming(true)}
          >
            Revoke invitation to {invitation.email}
          </Button>
        )}
      </Group>
      {confirming && (
        <Alert mt="sm" color="yellow" title="Revoke this invitation?">
          <Text mb="sm">
            This prevents the invitation being accepted. It does not remove an existing
            membership.
          </Text>
          <Group>
            <Button
              color="red"
              loading={submitting}
              onClick={() =>
                void run(async () => {
                  await api.post(
                    `/organisations/${organisationId}/invitations/${invitation.id}/revoke/`,
                  );
                  await onSaved();
                  setConfirming(false);
                })
              }
            >
              Confirm invitation revocation
            </Button>
            <Button variant="default" onClick={() => setConfirming(false)}>
              Keep invitation
            </Button>
          </Group>
        </Alert>
      )}
      <SaveFailure message={failure} title="Could not revoke invitation" retainsDraft={false} />
    </Box>
  );
}
