import { Alert, Anchor, Box, Button, Group, Loader, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router";

import type { SafetyFileDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { HazardLog } from "../components/HazardLog";
import { HistoryTable } from "../components/HistoryTable";
import { PDFDownload } from "../components/PDFDownload";

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
          {detail.head_sha && file.standard === "DCB0160" && (
            <PDFDownload key={detail.head_sha} slug={file.slug} head={detail.head_sha} />
          )}
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

          <Group justify="space-between" mt="xl" mb="sm">
            <Title order={2} size="h3">
              Hazards
            </Title>
            {detail.can_edit && (
              <Button component={Link} to={`/safety-files/${file.slug}/hazards/new`}>
                Record hazard
              </Button>
            )}
          </Group>

          <HazardLog hazards={detail.hazards ?? []} slug={file.slug} />

          <Title order={2} size="h3" mt="xl" mb="sm">
            Audit trail
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            Every change is a commit attributed to the person who made it. This is the record a
            regulator or a court would examine.
          </Text>

          <HistoryTable history={detail.history ?? []} caption="The ten most recent changes" />
        </>
      )}
    </Box>
  );
}
