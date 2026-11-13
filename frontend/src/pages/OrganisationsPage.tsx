import { Alert, Anchor, Box, List, Loader, Text, Title } from "@mantine/core";
import { Link } from "react-router";

import type { OrganisationSummary } from "../api/types";
import { useApiResource } from "../api/useApiResource";

export function OrganisationsPage() {
  const { data, error } = useApiResource<OrganisationSummary[]>("/organisations/");
  if (error)
    return (
      <Alert color="red" role="alert" title="Could not load your organisations">
        {error}
      </Alert>
    );
  if (!data) return <Loader aria-label="Loading your organisations" />;
  return (
    <Box maw={960}>
      <Title order={1} size="h2" mb="sm">
        Your organisations
      </Title>
      <Text mb="lg">
        Membership, administration and CSO appointment are separate from access to a safety
        file. Federation and practice files are not shared automatically.
      </Text>
      {data.length === 0 ? (
        <Text>
          You have no active organisation memberships. Accept an invitation from an organisation
          administrator, or ask the Turva operator to provision your organisation.
        </Text>
      ) : (
        <List spacing="lg" listStyleType="none">
          {data.map((organisation) => (
            <List.Item key={organisation.id}>
              <Anchor component={Link} to={`/organisations/${organisation.id}`} fw={600}>
                {organisation.name}
              </Anchor>
              <Text size="xs" c="dimmed">
                Organisation reference: {organisation.id}
              </Text>
              <Text size="sm">
                {organisation.membership.is_administrator
                  ? "Organisation administrator"
                  : "Member"}
                {organisation.membership.eligible_cso
                  ? " · Appointed CSO"
                  : organisation.membership.is_cso
                    ? " · CSO appointment needs review"
                    : " · No CSO appointment"}
              </Text>
            </List.Item>
          ))}
        </List>
      )}
      <Text size="sm" c="dimmed" mt="xl">
        An appointment records an organisation's decision, not Turva verifying professional
        registration or competence.
      </Text>
    </Box>
  );
}
