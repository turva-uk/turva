import { Anchor, Box, NativeSelect, SimpleGrid, Table, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { Link } from "react-router";

import type { Hazard } from "../api/types";
import { RiskLevel } from "./RiskLevel";

export function HazardLog({ hazards, slug }: { hazards: Hazard[]; slug: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  if (hazards.length === 0)
    return (
      <Box>
        <Text mb="xs">No hazards recorded yet.</Text>
        <Text c="dimmed" size="sm">
          An empty hazard log is not evidence of a safe system. It means hazard identification
          has not been done.
        </Text>
      </Box>
    );
  const filtered = hazards.filter(
    (h) =>
      (!status || h.status === status) &&
      [h.id, h.title, h.cause, h.effect, h.harm]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
        <TextInput
          label="Find a hazard"
          placeholder="Identifier, title, cause or harm"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <NativeSelect
          label="Hazard status"
          value={status}
          onChange={(e) => setStatus(e.currentTarget.value)}
          data={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
            { value: "transferred", label: "Transferred" },
          ]}
        />
      </SimpleGrid>
      <Text size="sm" role="status" mb="sm">
        Showing {filtered.length} of {hazards.length} hazards.
      </Text>
      {filtered.length === 0 ? (
        <Text>No hazards match these filters. Clear the search or choose another status.</Text>
      ) : (
        <Table striped highlightOnHover className="responsive-table">
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
            {filtered.map((hazard) => (
              <Table.Tr key={hazard.id}>
                <Table.Td data-label="ID">
                  <strong>{hazard.id}</strong>
                </Table.Td>
                <Table.Td data-label="Hazard">
                  <Anchor component={Link} to={`/safety-files/${slug}/hazards/${hazard.id}`}>
                    {hazard.title}
                  </Anchor>
                </Table.Td>
                <Table.Td data-label="Status">{hazard.status}</Table.Td>
                <Table.Td data-label="Initial risk">
                  <RiskLevel assessment={hazard.initial} label="initial" />
                </Table.Td>
                <Table.Td data-label="Residual risk">
                  <RiskLevel assessment={hazard.residual} label="residual" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Text size="sm" c="dimmed" mt="xs">
        Risk level is derived from severity and likelihood by the storage layer. It is never
        entered.
      </Text>
    </>
  );
}
