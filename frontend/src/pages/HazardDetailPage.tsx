import {
  Alert,
  Anchor,
  Box,
  Button,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link, useParams } from "react-router";

import type { HazardDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { HistoryTable } from "../components/HistoryTable";
import { RiskLevel } from "../components/RiskLevel";

export function HazardDetailPage() {
  const { slug, hazardId } = useParams();
  const { data, error } = useApiResource<HazardDetail>(
    `/safety-files/${slug}/hazards/${hazardId}/`,
    "That hazard does not exist, or you do not have access to it.",
  );
  if (error)
    return (
      <Alert color="red" role="alert" title="Could not load that hazard">
        {error}
      </Alert>
    );
  if (!data) return <Loader aria-label="Loading the hazard" />;
  const { hazard, safety_file: file } = data;
  return (
    <Box maw={960}>
      <Anchor component={Link} to={`/safety-files/${slug}`}>
        Back to {file.name}
      </Anchor>
      <Title order={1} size="h2" mt="md">
        {hazard.id}: {hazard.title}
      </Title>
      {data.can_edit && (
        <Button component={Link} to={`/safety-files/${slug}/hazards/${hazard.id}/edit`} mt="sm">
          Edit hazard
        </Button>
      )}
      <Text mt="xs">
        Status: {hazard.status} · Responsible person: {hazard.owner || "Not recorded"}
      </Text>
      <Text size="sm" c="dimmed">
        Created {hazard.created} · Updated {hazard.updated}
      </Text>
      {data.problems.length > 0 && (
        <Alert color="red" role="alert" mt="md" title="This safety file does not validate">
          <ul>
            {data.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}
      {hazard.requires_elimination && (
        <Alert color="red" role="alert" mt="md" title="Residual risk requires elimination">
          The derived residual risk level is {hazard.residual.risk_level}. A closed or
          transferred status does not by itself reduce that assessment.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg">
        <Box>
          <Title order={2} size="h3">
            Initial risk
          </Title>
          <RiskLevel assessment={hazard.initial} label="initial" />
        </Box>
        <Box>
          <Title order={2} size="h3">
            Residual risk
          </Title>
          <RiskLevel assessment={hazard.residual} label="residual" />
        </Box>
      </SimpleGrid>
      <Stack mt="lg" gap="lg">
        {(
          [
            ["Cause", hazard.cause],
            ["Effect on the care pathway", hazard.effect],
            ["Potential harm", hazard.harm],
            ["Risk justification", hazard.justification],
          ] as const
        ).map(([label, value]) => (
          <Box key={label}>
            <Title order={2} size="h3" mb="xs">
              {label}
            </Title>
            <Text style={{ whiteSpace: "pre-wrap" }}>{value || "Not recorded."}</Text>
          </Box>
        ))}
        {hazard.body && (
          <Box>
            <Title order={2} size="h3" mb="xs">
              Recorded narrative (Markdown)
            </Title>
            <Text component="pre" className="evidence-text">
              {hazard.body}
            </Text>
          </Box>
        )}
        <Box>
          <Title order={2} size="h3" mb="sm">
            Linked mitigations
          </Title>
          {data.mitigations.length === 0 && <Text>No linked mitigations recorded.</Text>}
          {data.mitigations.map((m) => (
            <Box key={m.id} component="section" mb="lg" aria-label={m.id}>
              <Title order={3} size="h4">
                {m.id}: {m.title}
              </Title>
              <Text size="sm">
                {m.status} · {m.control_type} control · Responsible person:{" "}
                {m.owner || "Not recorded"}
              </Text>
              <Text mt="xs" style={{ whiteSpace: "pre-wrap" }}>
                {m.evidence || "Implementation evidence not recorded."}
              </Text>
              {m.body && (
                <Text component="pre" className="evidence-text">
                  {m.body}
                </Text>
              )}
            </Box>
          ))}
        </Box>
        <Box>
          <Title order={2} size="h3" mb="sm">
            Hazard history
          </Title>
          <HistoryTable
            history={data.history}
            caption="Up to 50 most recent changes to this hazard, including renames"
          />
        </Box>
        <Text size="xs" c="dimmed">
          Repository version: <code>{data.head_sha}</code>. This is recorded evidence, not
          confirmation that the system is safe.
        </Text>
      </Stack>
    </Box>
  );
}
