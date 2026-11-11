import { Anchor, Table, Text } from "@mantine/core";
import { Link } from "react-router";

import type { Mitigation } from "../api/types";

export function MitigationList({
  mitigations,
  slug,
}: {
  mitigations: Mitigation[];
  slug: string;
}) {
  if (mitigations.length === 0) return <Text>No mitigations recorded yet.</Text>;
  return (
    <Table striped highlightOnHover className="responsive-table">
      <Table.Caption>Mitigations and their linked hazards</Table.Caption>
      <Table.Thead>
        <Table.Tr>
          {["ID", "Mitigation", "Status", "Control type", "Hazards"].map((label) => (
            <Table.Th key={label}>{label}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {mitigations.map((mitigation) => (
          <Table.Tr key={mitigation.id}>
            <Table.Td data-label="ID">{mitigation.id}</Table.Td>
            <Table.Td data-label="Mitigation">
              <Anchor
                component={Link}
                to={`/safety-files/${slug}/mitigations/${mitigation.id}`}
              >
                {mitigation.title}
              </Anchor>
            </Table.Td>
            <Table.Td data-label="Status">{mitigation.status}</Table.Td>
            <Table.Td data-label="Control type">{mitigation.control_type}</Table.Td>
            <Table.Td data-label="Hazards">
              {mitigation.hazards.length ? mitigation.hazards.join(", ") : "Not linked"}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
