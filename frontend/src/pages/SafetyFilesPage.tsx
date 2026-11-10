import { Alert, Anchor, Box, Button, Group, Loader, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router";

import type { SafetyFile } from "../api/types";
import { useApiResource } from "../api/useApiResource";

export function SafetyFilesPage() {
  const { data: safetyFiles, error, loading } = useApiResource<SafetyFile[]>("/safety-files/");

  if (error) {
    return (
      <Alert color="red" role="alert" title="Could not load your safety files">
        {error}
      </Alert>
    );
  }

  if (loading || safetyFiles === null) {
    return <Loader aria-label="Loading your safety files" />;
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={1} size="h2">
          Your safety files
        </Title>
        <Button component={Link} to="/safety-files/new">
          Create safety file
        </Button>
      </Group>

      {safetyFiles.length === 0 ? (
        <Box>
          <Text mb="xs">You have no safety files yet.</Text>
          <Text c="dimmed" size="sm">
            A safety file is a Git repository holding the hazards, risk assessments, mitigations
            and safety case for one system. Turva creates and commits to it for you; you never
            need to use Git.
          </Text>
        </Box>
      ) : (
        <Table striped highlightOnHover className="responsive-table">
          <Table.Caption>Safety files you own or that have been published</Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>System</Table.Th>
              <Table.Th>Standard</Table.Th>
              <Table.Th>Organisation</Table.Th>
              <Table.Th>Visibility</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {safetyFiles.map((file) => (
              <Table.Tr key={file.id}>
                <Table.Td data-label="System">
                  <Anchor component={Link} to={`/safety-files/${file.slug}`}>
                    {file.name}
                  </Anchor>
                </Table.Td>
                <Table.Td data-label="Standard">{file.standard}</Table.Td>
                <Table.Td data-label="Organisation">{file.organisation}</Table.Td>
                <Table.Td data-label="Visibility">
                  {file.visibility === "public" ? "Public" : "Private"}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}
