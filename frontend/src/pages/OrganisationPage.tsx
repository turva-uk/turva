import { Box, Stack } from "@mantine/core";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { ApiError, api } from "../api/client";
import type {
  OrganisationDetail,
  OrganisationInvitation,
  OrganisationMember,
} from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { BaseCard, FieldsetCard } from "../components/base-card";
import { AddButton, SecondaryButton } from "../components/button";
import ConfirmModal from "../components/confirm-modal/ConfirmModal";
import { CheckboxField, EMAIL_PATTERN, EmailField } from "../components/form";
import { FormModal } from "../components/form-modal";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { GuidanceNote, StateMessage } from "../components/message-cards";
import {
  DataTable,
  DataTableControlled,
  filterGroups,
  type FilterGroup,
} from "../components/tables";
import type { Column } from "../components/tables/DataTable";
import { BodyText, ExternalTextLink, Heading, PageHeader } from "../components/typography";
import { usePageSublink } from "../components/navigation";
import { apiFailure } from "../lib/forms";

export function OrganisationPage() {
  const { organisationId } = useParams();
  const { data, error } = useApiResource<OrganisationDetail>(
    `/organisations/${organisationId}/`,
    "That organisation does not exist, or you are not an active member.",
  );
  // The organisation's name sits under "Organisations" in the side bar, in
  // place of a link back to the list.
  usePageSublink(
    data
      ? { parent: "/organisations", to: `/organisations/${data.id}`, label: data.name }
      : null,
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
  const navigate = useNavigate();

  return (
    <Stack gap="lg">
      <GuidanceNote
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

      <BaseCard>
        <Stack gap="sm">
          <Heading>Invitations</Heading>
          <InvitationsTable
            invitations={data.invitations ?? []}
            organisationId={data.id}
            onSaved={onSaved}
          />
        </Stack>
      </BaseCard>

      <BaseCard>
        <Stack gap="sm">
          <Heading>This organisation&apos;s safety files</Heading>
          <BodyText>
            Choose who leads and works on each safety file this organisation has adopted. You
            can change a file's team here, but not read its hazards or make safety judgements. A
            file appears once its owner adopts it into this organisation.
          </BodyText>
          <DataTable<AdoptedFile>
            data={data.files ?? []}
            columns={FILE_COLUMNS}
            getRowKey={(file) => file.slug}
            onRowClick={(file) => void navigate(`/safety-files/${file.slug}/team`)}
            label="Adopted safety files"
            emptyMessage="No files have been adopted into this organisation."
          />
        </Stack>
      </BaseCard>

      <BaseCard>
        <Stack gap="sm">
          <Heading>Recent administration history</Heading>
          <BodyText>
            Operational history, not the safety evidence audit trail. File-team decisions and
            clinical changes are attributed in each file&apos;s history.
          </BodyText>
          <DataTableControlled<AdministrationEvent>
            data={data.events ?? []}
            searchFields={(event) => [event.action, event.subject, event.actor__email]}
            columns={EVENT_COLUMNS}
            getRowKey={(event) => `${event.created_at}:${event.action}:${event.subject}`}
            label="Administration history"
            emptyMessage="No administration events recorded."
          />
        </Stack>
      </BaseCard>
    </Stack>
  );
}

type AdoptedFile = NonNullable<OrganisationDetail["files"]>[number];

// The server sends the files newest first, which is the order shown until
// a heading is chosen.
const FILE_COLUMNS: Column<AdoptedFile>[] = [
  { header: "Safety file", render: (file) => file.name, accessor: (file) => file.name },
  {
    header: "Last updated",
    render: (file) =>
      file.last_updated
        ? new Date(file.last_updated).toLocaleString("en-GB", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "Not known",
    accessor: (file) => (file.last_updated ? new Date(file.last_updated) : null),
  },
];

type AdministrationEvent = NonNullable<OrganisationDetail["events"]>[number];

const EVENT_COLUMNS: Column<AdministrationEvent>[] = [
  {
    header: "When",
    // Hours and minutes, as the safety file history shows them: seconds add
    // nothing to an administration record.
    render: (event) =>
      new Date(event.created_at).toLocaleString("en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    accessor: (event) => new Date(event.created_at),
  },
  { header: "Action", render: (event) => event.action, accessor: (event) => event.action },
  // Names, not email addresses. An invitation to somebody who has not
  // joined has no name to show, so it keeps the address it was sent to.
  {
    header: "Subject",
    render: (event) => event.subject_name ?? event.subject,
    accessor: (event) => event.subject_name ?? event.subject,
  },
  {
    header: "By",
    render: (event) => event.actor_name ?? event.actor__email,
    accessor: (event) => event.actor_name ?? event.actor__email,
  },
];

/** Where a member's CSO appointment stands, as a member who is not an administrator sees it. */
function appointmentOf(member: OrganisationMember): string {
  if (member.eligible_cso) return "Appointed (not professional verification)";
  if (member.is_cso) return "Appointment needs review";

  return "Not appointed";
}

/** Whether a member administers the organisation. */
function administrationOf(member: OrganisationMember): string {
  return member.is_administrator ? "Administrator" : "Member";
}

const MEMBER_COLUMNS: Column<OrganisationMember>[] = [
  {
    header: "Person",
    render: (member) => `${member.name}, ${member.email}`,
    accessor: (member) => member.name,
  },
  { header: "Administration", render: administrationOf, accessor: administrationOf },
  { header: "CSO appointment", render: appointmentOf, accessor: appointmentOf },
];

const MEMBER_FILTERS: FilterGroup<OrganisationMember>[] = [
  {
    key: "administration",
    label: "Administration",
    valueOf: administrationOf,
    values: ["Administrator", "Member"],
  },
  {
    key: "appointment",
    label: "CSO appointment",
    valueOf: appointmentOf,
    values: [
      "Appointed (not professional verification)",
      "Appointment needs review",
      "Not appointed",
    ],
  },
];

function MembersTable({ members }: { members: OrganisationMember[] }) {
  return (
    <DataTableControlled<OrganisationMember>
      data={members}
      {...filterGroups(members, MEMBER_FILTERS)}
      filterLabel="Filter members"
      filterAriaLabel="Filter members"
      searchFields={(member) => [member.name, member.email]}
      columns={MEMBER_COLUMNS}
      getRowKey={(member) => member.id}
      label="Members of this organisation"
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

/** Whether saving these values takes a role away from the member. */
function removesARole(member: OrganisationMember, values: RoleValues): boolean {
  return (
    (member.active && !values.active) ||
    (member.is_cso && !values.is_cso) ||
    (member.is_administrator && !values.is_administrator)
  );
}

/** What the member will lose, and what that means for their file access. */
function whatIsLost(member: OrganisationMember, values: RoleValues): string {
  if (member.active && !values.active) {
    return `${member.name} will lose their membership of this organisation, and every role in it. That removes their private file access. Old CSO file grants will not return if they rejoin.`;
  }

  const losesCso = member.is_cso && !values.is_cso;
  const lost = [
    ...(losesCso ? ["their CSO appointment"] : []),
    ...(member.is_administrator && !values.is_administrator ? ["administrator status"] : []),
  ];
  const consequence = losesCso
    ? "Removing a CSO appointment removes private file access. Old CSO file grants will not return on reappointment."
    : "Removing administrator status alone does not change file access.";

  return `${member.name} will lose ${lost.join(" and ")}. ${consequence}`;
}

function RoleFields({ member }: { member: OrganisationMember }) {
  const { methods } = useFormContext<RoleValues>();
  const values = methods.watch();

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
      <SubmitButton disabled={!member.active} />
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
    <FieldsetCard legend={member.name} description={member.email}>
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
          confirm={{
            // Only taking a role away asks first; adding one saves at once.
            when: (values) => removesARole(member, values),
            title: `Change roles for ${member.name}?`,
            children: (values) => whatIsLost(member, values),
            acceptLabel: "Save role changes",
            submittingLabel: "Saving…",
            cancelLabel: "Keep current roles",
          }}
        >
          <Stack gap="md">
            <FormStatus retainsDraft />
            <RoleFields member={member} />
          </Stack>
        </Form>
      </Stack>
    </FieldsetCard>
  );
}

type InviteValues = { email: string };

function InviteFields() {
  const { methods } = useFormContext<InviteValues>();

  return (
    <EmailField
      label="Invitee's email address"
      required
      data-autofocus
      {...methods.register("email", {
        required: "Enter the invitee's email address",
        pattern: EMAIL_PATTERN,
      })}
      error={methods.formState.errors.email?.message}
    />
  );
}

function InviteModal({
  organisationId,
  opened,
  onClose,
  onSaved,
}: {
  organisationId: string;
  opened: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  async function invite(values: InviteValues): Promise<FormSubmitResult<InviteValues>> {
    try {
      const result = await api.post<{ email_sent: boolean }>(
        `/organisations/${organisationId}/invitations/`,
        values,
      );
      await onSaved();

      if (result.email_sent) {
        return {
          state: "success",
          message: {
            title: "Invitation sent",
            description: "The invitation email has been sent. It expires in seven days.",
          },
        };
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
    <FormModal<InviteValues>
      opened={opened}
      onClose={onClose}
      title="Invite a member"
      intro="An invitation grants membership only after the recipient accepts using the same verified email address. It does not appoint a CSO or share a safety file."
      defaultValues={{ email: "" }}
      onSubmit={invite}
      submitLabel="Send membership invitation"
      submittingLabel="Sending…"
    >
      <InviteFields />
    </FormModal>
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
  const [inviting, setInviting] = useState(false);
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
        // Starts at the cell's left edge, under the "Action" heading.
        invitationStatus(invitation, openedAt) === "Pending" ? (
          <SecondaryButton
            onClick={() => setRevoking(invitation)}
            aria-label={`Revoke invitation to ${invitation.email}`}
          >
            Revoke
          </SecondaryButton>
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
      <DataTableControlled<OrganisationInvitation>
        data={invitations}
        {...filterGroups(invitations, [
          {
            key: "status",
            label: "Status",
            valueOf: (invitation) => invitationStatus(invitation, openedAt),
            values: ["Pending", "Accepted", "Revoked", "Expired"],
          },
        ])}
        filterLabel="Filter invitations"
        filterAriaLabel="Filter invitations"
        searchFields={(invitation) => [invitation.email]}
        columns={columns}
        getRowKey={(invitation) => invitation.id}
        emptyMessage="No invitations recorded."
        label="Invitations"
        action={<AddButton label="Invite a member" onClick={() => setInviting(true)} />}
      />
      <InviteModal
        organisationId={organisationId}
        opened={inviting}
        onClose={() => setInviting(false)}
        onSaved={onSaved}
      />
      <ConfirmModal
        opened={revoking !== null}
        onClose={() => setRevoking(null)}
        onAccept={revoke}
        title="Revoke this invitation?"
        acceptLabel="Revoke invitation"
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
