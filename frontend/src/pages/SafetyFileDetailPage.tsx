import { Alert, Anchor, Box, Loader, Table, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router";

import type { SafetyFileDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { RiskLevel } from "../components/RiskLevel";

const NOT_FOUND = "That safety file does not exist, or you do not have access to it.";

export function SafetyFileDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    data: detail,
    error,
    loading,
  } = useApiResource<SafetyFileDetail>(`/safety-files/${slug}/`, NOT_FOUND);

  if (error) {
    return (
      <Alert color="red" role="alert" title="Could not load that safety file">
        {error}
      </Alert>
    );
  }

  if (loading || detail === null) {
    return <Loader aria-label="Loading the safety file" />;
  }

  const file = detail.safety_file;

  return (
    <Box>
      <Title order={1} size="h2">
        {file.name}
      </Title>
      <Text c="dimmed" mb="md">
        {file.standard_display} &middot; {file.organisation}
      </Text>
      <Anchor component={Link} to="/safety-files">
        All safety files
      </Anchor>

      {detail.repository_missing ? (
        <Alert color="red" mt="md" role="alert" title="The repository is not on disk">
          <Text size="sm">
            Turva expected to find it at <code>{detail.repository_path}</code>.
          </Text>
          <Text size="sm" mt="xs">
            The repository is the record and the database is only an index, so this is
            recoverable but needs a person: restore the repository from backup, then run{" "}
            <code>manage.py reindex_safety_files</code>. Do not delete this entry - it is the
            evidence that the safety file existed.
          </Text>
        </Alert>
      ) : (
        <>
          {detail.problems && detail.problems.length > 0 && (
            <Alert color="red" mt="md" role="alert" title="This safety file does not validate">
              <ul>
                {detail.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Alert>
          )}

          {detail.blocking && detail.blocking.length > 0 && (
            <Alert
              color="red"
              mt="md"
              role="alert"
              title="Residual risk requires elimination before go-live"
            >
              {detail.blocking.join(", ")} {detail.blocking.length === 1 ? "has" : "have"} a
              derived residual risk level of 4 or 5 and{" "}
              {detail.blocking.length === 1 ? "is" : "are"} still open.
            </Alert>
          )}

          <Title order={2} size="h3" mt="xl" mb="sm">
            Hazards
          </Title>

          {detail.hazards && detail.hazards.length > 0 ? (
            <>
              <Table striped highlightOnHover>
                <Table.Caption>Hazards recorded in this safety file</Table.Caption>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Hazard</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Initial risk</Table.Th>
                    <Table.Th>Residual risk</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detail.hazards.map((hazard) => (
                    <Table.Tr key={hazard.id}>
                      <Table.Td>
                        <strong>{hazard.id}</strong>
                      </Table.Td>
                      <Table.Td>{hazard.title}</Table.Td>
                      <Table.Td>{hazard.status}</Table.Td>
                      <Table.Td>
                        <RiskLevel assessment={hazard.initial} label="initial" />
                      </Table.Td>
                      <Table.Td>
                        <RiskLevel assessment={hazard.residual} label="residual" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Text size="sm" c="dimmed" mt="xs">
                Risk level is derived from severity and likelihood. It is never entered, and
                cannot be set to disagree with the assessment it summarises.
              </Text>
            </>
          ) : (
            <Box>
              <Text mb="xs">No hazards recorded yet.</Text>
              <Text c="dimmed" size="sm">
                An empty hazard log is not evidence of a safe system. It means hazard
                identification has not been done.
              </Text>
            </Box>
          )}

          <Title order={2} size="h3" mt="xl" mb="sm">
            Audit trail
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            Every change is a commit attributed to the person who made it. This is the record a
            regulator or a court would examine.
          </Text>

          <Table>
            <Table.Caption>The ten most recent changes</Table.Caption>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Commit</Table.Th>
                <Table.Th>Change</Table.Th>
                <Table.Th>By</Table.Th>
                <Table.Th>When</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(detail.history ?? []).map((commit) => (
                <Table.Tr key={commit.short_sha}>
                  <Table.Td>
                    <code>{commit.short_sha}</code>
                  </Table.Td>
                  <Table.Td>{commit.subject}</Table.Td>
                  <Table.Td>{commit.author_name}</Table.Td>
                  <Table.Td>
                    <time dateTime={commit.committed_at}>
                      {new Date(commit.committed_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Box>
  );
}
