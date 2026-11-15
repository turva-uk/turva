import { Alert, Anchor, Box, Button, Loader, Stack, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router";

import type { MitigationDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { HistoryTable } from "../components/HistoryTable";

export function MitigationDetailPage() {
  const { slug, mitigationId } = useParams();
  const { data, error } = useApiResource<MitigationDetail>(
    `/safety-files/${slug}/mitigations/${mitigationId}/`,
    "That mitigation does not exist, or you do not have access to it.",
  );
  if (error)
    return (
      <Alert color="red" role="alert" title="Could not load that mitigation">
        {error}
      </Alert>
    );
  if (!data) return <Loader aria-label="Loading the mitigation" />;
  const { mitigation, safety_file: file } = data;
  return (
    <Box maw={960}>
      <Anchor component={Link} to={`/safety-files/${slug}`}>
        Back to {file.name}
      </Anchor>
      <Title order={1} size="h2" mt="md">
        {mitigation.id}: {mitigation.title}
      </Title>
      {data.can_edit && (
        <Button
          component={Link}
          to={`/safety-files/${slug}/mitigations/${mitigation.id}/edit`}
          mt="sm"
        >
          Edit mitigation
        </Button>
      )}
      <Text mt="xs">
        Status: {mitigation.status} · {mitigation.control_type} control · Responsible person:{" "}
        {mitigation.owner || "Not recorded"}
      </Text>
      <Text size="sm" c="dimmed">
        Created {mitigation.created} · Updated {mitigation.updated}
      </Text>
      {data.problems.length > 0 && (
        <Alert color="red" role="alert" mt="md" title="This safety file does not validate">
          <ul>
            {data.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Stack mt="lg" gap="lg">
        <Box>
          <Title order={2} size="h3" mb="xs">
            Implementation and verification evidence
          </Title>
          <Text style={{ whiteSpace: "pre-wrap" }}>
            {mitigation.evidence ||
              "No implementation evidence recorded. A proposed control is not evidence of risk reduction."}
          </Text>
        </Box>
        {mitigation.body && (
          <Box>
            <Title order={2} size="h3" mb="xs">
              Recorded narrative (Markdown)
            </Title>
            <Text component="pre" className="evidence-text">
              {mitigation.body}
            </Text>
          </Box>
        )}
        <Box>
          <Title order={2} size="h3" mb="xs">
            Linked hazards
          </Title>
          {mitigation.hazards.length === 0 ? (
            <Text>No linked hazards recorded.</Text>
          ) : (
            <ul>
              {data.hazards
                .filter((hazard) => mitigation.hazards.includes(hazard.id))
                .map((hazard) => (
                  <li key={hazard.id}>
                    <Anchor component={Link} to={`/safety-files/${slug}/hazards/${hazard.id}`}>
                      {hazard.id}: {hazard.title}
                    </Anchor>
                  </li>
                ))}
            </ul>
          )}
          <Text size="sm" c="dimmed">
            Mitigation status and links never change a risk assessment automatically.
            Verification is recorded judgement, not certification by Turva.
          </Text>
        </Box>
        <Box>
          <Title order={2} size="h3" mb="sm">
            Mitigation history
          </Title>
          <HistoryTable
            history={data.history}
            caption="Up to 50 most recent changes to this mitigation, including renames and links"
          />
        </Box>
        <Text size="xs" c="dimmed">
          Repository version: <code>{data.head_sha}</code>. This is recorded evidence, not
          approval to deploy.
        </Text>
      </Stack>
    </Box>
  );
}
