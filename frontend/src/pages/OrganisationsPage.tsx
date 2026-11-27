import { Box, Stack } from "@mantine/core";

import type { OrganisationSummary } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { DataTable } from "../components/tables";
import type { Column } from "../components/tables/DataTable";
import { BodyText, PageHeader, TextLink } from "../components/typography";

/** What somebody is in an organisation: an administrator or a member. */
function roleOf(organisation: OrganisationSummary): string {
  return organisation.membership.is_administrator ? "Organisation administrator" : "Member";
}

/** Where somebody's CSO appointment stands in an organisation. */
function appointmentOf(organisation: OrganisationSummary): string {
  if (organisation.membership.eligible_cso) return "Appointed CSO";
  if (organisation.membership.is_cso) return "CSO appointment needs review";

  return "No CSO appointment";
}

const COLUMNS: Column<OrganisationSummary>[] = [
  {
    header: "Organisation",
    render: (organisation) => (
      <TextLink to={`/organisations/${organisation.id}`}>{organisation.name}</TextLink>
    ),
    accessor: (organisation) => organisation.name,
  },
  {
    header: "Organisation reference",
    render: (organisation) => organisation.id,
    accessor: (organisation) => organisation.id,
  },
  {
    header: "Your role",
    render: roleOf,
    accessor: roleOf,
  },
  {
    header: "CSO appointment",
    render: appointmentOf,
    accessor: appointmentOf,
  },
];

export function OrganisationsPage() {
  const { data, error } = useApiResource<OrganisationSummary[]>("/organisations/");

  return (
    <Box maw={960}>
      <Stack>
        <PageHeader title="Your organisations" />
        <BodyText>
          Membership, administration and CSO appointment are separate from access to a safety
          file. Federation and practice files are not shared automatically.
        </BodyText>

        <DataTable<OrganisationSummary>
          data={data ?? []}
          columns={COLUMNS}
          getRowKey={(organisation) => organisation.id}
          loading={!data && !error}
          error={error ? `Could not load your organisations. ${error}` : null}
          emptyMessage="You have no active organisation memberships. Accept an invitation from an organisation administrator, or ask the Turva operator to provision your organisation."
        />

        <BodyText c="dimmed">
          An appointment records an organisation&apos;s decision, not Turva verifying
          professional registration or competence.
        </BodyText>
      </Stack>
    </Box>
  );
}
