import { Box, Fieldset, Group, Stack } from "@mantine/core";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useParams } from "react-router";

import { ApiError, api } from "../api/client";
import type {
  OrganisationDetail,
  OrganisationInvitation,
  OrganisationMember,
} from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { SecondaryButton } from "../components/button";
import ConfirmModal from "../components/confirm-modal/ConfirmModal";
import { CheckboxField, EMAIL_PATTERN, EmailField } from "../components/form";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import { DataTable } from "../components/tables";
import type { Column } from "../components/tables/DataTable";
import {
  BodyText,
  ExternalTextLink,
  Heading,
  PageHeader,
  TextLink,
} from "../components/typography";
import { apiFailure } from "../lib/forms";

export function OrganisationPage() {
  const { organisationId } = useParams();
  const { data, error } = useApiResource<OrganisationDetail>(
    `/organisations/${organisationId}/`,
    "That organisation does not exist, or you are not an active member.",
  );

  if (error) {
    return (
      <Stack maw={1000}>
        <PageHeader title="Organisation" />
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="Could not load that organisation"
            description={error}
          />
        </Box>
      </Stack>
    );
  }
  if (!data) return <PageSpinner label="Loading the organisation" />;

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
      <Stack gap="lg">
        <TextLink to="/organisations" standalone>
          Back to your organisations
        </TextLink>
        <PageHeader title={data.name} subtitle={`Organisation reference: ${data.id}`} />

        {refreshFailed && (
          <Stack gap="xs" role="alert">
            <StateMessage
              icon={<IconAlertTriangle />}
              colour="warning"
              title="Change recorded; view not refreshed"
              description="The change was recorded, but Turva could not reload this organisation. These forms may now be stale. Do not repeat the save blindly."
            />
            <ExternalTextLink href={`/organisations/${data.id}`}>
              Open the latest organisation in another tab without losing other unsaved role
              changes
            </ExternalTextLink>
          </Stack>
        )}

        <BodyText>
          Administration manages membership and CSO appointments. Only currently appointed CSOs
          named on a file may edit its safety evidence.
        </BodyText>
        <Heading>Members and appointments</Heading>

        {data.membership.is_administrator ? (
          <AdministratorView data={data} onSaved={reload} />
        ) : (
          <MembersTable members={data.members} />
        )}
      </Stack>
    </Box>
  );
}

function AdministratorView({
  data,
  onSaved,
}: {
  data: OrganisationDetail;
  onSaved: () => Promise<void>;
}) {
  return (
    <Stack gap="lg">
      <StateMessage
        icon={<IconAlertTriangle />}
        colour="warning"
        title="Appointment is not professional verification"
        description="Check competence through your organisation's own governance. Turva requires the person's verified email and profile declaration, but does not check the public register. Removing membership or a CSO appointment revokes private file access; reappointment does not restore old file grants."
      />

      {data.members.map((member) => (
        <MemberRoles
          key={`${member.id}:${member.revision}`}
          member={member}
          organisationId={data.id}
          onSaved={onSaved}
        />
      ))}

      <InviteForm organisationId={data.id} onSaved={onSaved} />

      <Heading>Recent invitations</Heading>
      <InvitationsTable
        invitations={data.invitations ?? []}
        organisationId={data.id}
        onSaved={onSaved}
      />

      <Heading>File-team administration</Heading>
      <BodyText>
        This inventory lets administrators manage named teams, not read hazards or make safety
        judgements. Owners must explicitly adopt legacy files before they appear here.
      </BodyText>
      {data.files?.length ? (
        <Stack gap="xs">
          {data.files.map((file) => (
            <TextLink key={file.slug} to={`/safety-files/${file.slug}/team`} standalone>
              Manage file team: {file.name}
            </TextLink>
          ))}
        </Stack>
      ) : (
        <BodyText>No files have been adopted into this organisation.</BodyText>
      )}

      <Heading>Recent administration history</Heading>
      <BodyText>
        Operational history, not the safety evidence audit trail. File-team decisions and
        clinical changes are attributed in each file&apos;s Git history.
      </BodyText>
      <DataTable<NonNullable<OrganisationDetail["events"]>[number]>
        data={data.events ?? []}
        columns={EVENT_COLUMNS}
        getRowKey={(event) => `${event.created_at}:${event.action}:${event.subject}`}
        caption="Up to 100 recent organisation administration events"
        emptyMessage="No administration events recorded."
      />
    </Stack>
  );
}

type AdministrationEvent = NonNullable<OrganisationDetail["events"]>[number];

const EVENT_COLUMNS: Column<AdministrationEvent>[] = [
  {
    header: "When",
    render: (event) => new Date(event.created_at).toLocaleString("en-GB"),
    accessor: (event) => new Date(event.created_at),
  },
  { header: "Action", render: (event) => event.action, accessor: (event) => event.action },
  { header: "Subject", render: (event) => event.subject, accessor: (event) => event.subject },
  {
    header: "By",
    render: (event) => event.actor__email,
    accessor: (event) => event.actor__email,
  },
];

/** Where a member's CSO appointment stands, as a member who is not an administrator sees it. */
function appointmentOf(member: OrganisationMember): string {
  if (member.eligible_cso) return "Appointed (not professional verification)";
  if (member.is_cso) return "Appointment needs review";

  return "Not appointed";
}

const MEMBER_COLUMNS: Column<OrganisationMember>[] = [
  {
    header: "Person",
    render: (member) => `${member.name}, ${member.email}`,
    accessor: (member) => member.name,
  },
  {
    header: "Administration",
    render: (member) => (member.is_administrator ? "Administrator" : "Member"),
  },
  { header: "CSO appointment", render: appointmentOf, accessor: appointmentOf },
];

function MembersTable({ members }: { members: OrganisationMember[] }) {
  return (
    <DataTable<OrganisationMember>
      data={members}
      columns={MEMBER_COLUMNS}
      getRowKey={(member) => member.id}
      caption="Active members of this organisation"
      emptyMessage="No active members."
    />
  );
}

type RoleValues = { active: boolean; is_administrator: boolean; is_cso: boolean };

const ROLE_FIELDS = ["active", "is_administrator", "is_cso"] as const;

/** What the member's roles say now, before any change. */
function roleStatus(member: OrganisationMember): string {
  if (!member.active) return "Membership removed. Send a new invitation to rejoin.";
  if (member.eligible_cso) {
    return "Current CSO appointment. Professional competence is not verified by Turva.";
  }
  if (member.is_cso) {
    return "The recorded CSO appointment is no longer eligible. Check the profile declaration and explicitly reappoint if appropriate.";
  }

  return "No CSO appointment.";
}

function RoleFields({
  member,
  confirmed,
  onConfirm,
}: {
  member: OrganisationMember;
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
}) {
  const { methods } = useFormContext<RoleValues>();
  const values = methods.watch();
  const removing =
    (member.active && !values.active) ||
    (member.is_cso && !values.is_cso) ||
    (member.is_administrator && !values.is_administrator);

  return (
    <Stack gap="md">
      <Controller
        control={methods.control}
        name="active"
        render={({ field }) => (
          <CheckboxField
            label="Membership active"
            disabled={!member.active}
            checked={field.value}
            onChange={(event) => {
              const active = event.currentTarget.checked;
              field.onChange(active);
              if (!active) {
                methods.setValue("is_administrator", false, { shouldDirty: true });
                methods.setValue("is_cso", false, { shouldDirty: true });
              }
              onConfirm(false);
            }}
          />
        )}
      />
      <CheckboxField
        label="Organisation administrator"
        disabled={!values.active}
        {...methods.register("is_administrator")}
      />
      <CheckboxField
        label="Appointed Clinical Safety Officer"
        description="The person must first complete their own profile declaration."
        disabled={!values.active}
        {...methods.register("is_cso")}
      />
      {removing && (
        <CheckboxField
          label={`I understand these role changes for ${member.email}. Removing membership or a CSO appointment removes private file access; removing administrator status alone does not. Old CSO file grants will not return on reappointment.`}
          checked={confirmed}
          onChange={(event) => onConfirm(event.currentTarget.checked)}
        />
      )}
      <SubmitButton disabled={!member.active || (removing && !confirmed)} />
    </Stack>
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
  const [confirmed, setConfirmed] = useState(false);

  async function save(values: RoleValues): Promise<FormSubmitResult<RoleValues>> {
    try {
      await api.patch(`/organisations/${organisationId}/members/${member.id}/`, {
        ...values,
        expected_revision: member.revision,
      });
      await onSaved();

      return { state: "success", message: { title: `Roles saved for ${member.name}` } };
    } catch (error) {
      return apiFailure<RoleValues>(error, "Could not save membership", ROLE_FIELDS);
    }
  }

  return (
    <Fieldset legend={`${member.name} (${member.email})`}>
      <Stack gap="sm">
        <BodyText>{roleStatus(member)}</BodyText>
        <Form<RoleValues>
          defaultValues={{
            active: member.active,
            is_administrator: member.is_administrator,
            is_cso: member.is_cso,
          }}
          onSubmit={save}
          submitLabel={`Save roles for ${member.name}`}
          submittingLabel="Saving…"
        >
          <Stack gap="md">
            <FormStatus retainsDraft />
            <RoleFields member={member} confirmed={confirmed} onConfirm={setConfirmed} />
          </Stack>
        </Form>
      </Stack>
    </Fieldset>
  );
}

type InviteValues = { email: string };

function InviteFields() {
  const { methods } = useFormContext<InviteValues>();

  return (
    <EmailField
      label="Invitee's email address"
      required
      {...methods.register("email", {
        required: "Enter the invitee's email address",
        pattern: EMAIL_PATTERN,
      })}
      error={methods.formState.errors.email?.message}
    />
  );
}

function InviteForm({
  organisationId,
  onSaved,
}: {
  organisationId: string;
  onSaved: () => Promise<void>;
}) {
  // A sent invitation clears the field by starting a fresh form, and its
  // notice is shown above that form.
  const [round, setRound] = useState(0);
  const [sentNotice, setSentNotice] = useState(false);

  async function invite(values: InviteValues): Promise<FormSubmitResult<InviteValues>> {
    try {
      const result = await api.post<{ email_sent: boolean }>(
        `/organisations/${organisationId}/invitations/`,
        values,
      );
      await onSaved();

      if (result.email_sent) {
        return { state: "success", message: { title: "Invitation sent" } };
      }

      return {
        state: "partial_success",
        message: {
          title: "Invitation recorded, email not sent",
          description:
            "The invitation was recorded, but its email could not be sent. Check mail delivery and try again after ten minutes.",
        },
      };
    } catch (error) {
      return apiFailure<InviteValues>(error, "Could not invite this member", ["email"]);
    }
  }

  return (
    <Stack component="section" gap="sm">
      <Heading>Invite a member</Heading>
      <BodyText>
        An invitation grants membership only after the recipient accepts using the same verified
        email address. It does not appoint a CSO or share a safety file.
      </BodyText>
      {sentNotice && (
        <FormStatus
          variant="success"
          title="Invitation sent"
          description="Invitation email sent. It expires in seven days."
          onDismiss={() => setSentNotice(false)}
        />
      )}
      <Form<InviteValues>
        key={round}
        defaultValues={{ email: "" }}
        onSubmit={invite}
        onSuccess={() => {
          setSentNotice(true);
          setRound((current) => current + 1);
        }}
        submitLabel="Send membership invitation"
        submittingLabel="Sending…"
      >
        <Stack>
          <FormStatus retainsDraft />
          <InviteFields />
          <SubmitButton />
        </Stack>
      </Form>
    </Stack>
  );
}

/** Where an invitation stands, as of when the page was opened. */
function invitationStatus(invitation: OrganisationInvitation, openedAt: number): string {
  if (invitation.accepted_at) return "Accepted";
  if (invitation.revoked_at) return "Revoked";
  if (Date.parse(invitation.expires_at) <= openedAt) return "Expired";

  return "Pending";
}

function InvitationsTable({
  invitations,
  organisationId,
  onSaved,
}: {
  invitations: OrganisationInvitation[];
  organisationId: string;
  onSaved: () => Promise<void>;
}) {
  const [openedAt] = useState(() => Date.now());
  const [revoking, setRevoking] = useState<OrganisationInvitation | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function revoke() {
    if (!revoking) return;

    setFailure(null);
    try {
      await api.post(`/organisations/${organisationId}/invitations/${revoking.id}/revoke/`);
      await onSaved();
      setRevoking(null);
    } catch (error) {
      setRevoking(null);
      setFailure(
        error instanceof ApiError ? error.message : "Something went wrong. Try again.",
      );
    }
  }

  const columns: Column<OrganisationInvitation>[] = [
    { header: "Email", render: (invitation) => invitation.email, accessor: (i) => i.email },
    {
      header: "Status",
      render: (invitation) => invitationStatus(invitation, openedAt),
      accessor: (invitation) => invitationStatus(invitation, openedAt),
    },
    {
      header: "Action",
      render: (invitation) =>
        invitationStatus(invitation, openedAt) === "Pending" ? (
          <Group justify="flex-end">
            <SecondaryButton onClick={() => setRevoking(invitation)}>
              Revoke invitation to {invitation.email}
            </SecondaryButton>
          </Group>
        ) : null,
    },
  ];

  return (
    <Stack gap="sm">
      {failure && (
        <FormStatus
          variant="error"
          title="Could not revoke invitation"
          description={failure}
          onDismiss={() => setFailure(null)}
        />
      )}
      <DataTable<OrganisationInvitation>
        data={invitations}
        columns={columns}
        getRowKey={(invitation) => invitation.id}
        emptyMessage="No invitations recorded."
      />
      <ConfirmModal
        opened={revoking !== null}
        onClose={() => setRevoking(null)}
        onAccept={revoke}
        title="Revoke this invitation?"
        acceptLabel="Confirm invitation revocation"
        submittingLabel="Revoking…"
        cancelLabel="Keep invitation"
        destructive
      >
        This prevents the invitation to {revoking?.email} being accepted. It does not remove an
        existing membership.
      </ConfirmModal>
    </Stack>
  );
}
