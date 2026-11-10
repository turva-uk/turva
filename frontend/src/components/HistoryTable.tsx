import { Box, Table, Text } from "@mantine/core";

import type { Commit } from "../api/types";

export function HistoryTable({ history, caption }: { history: Commit[]; caption: string }) {
  if (history.length === 0) return <Text>No recorded changes were returned.</Text>;
  return (
    <Table className="responsive-table">
      <Table.Caption>{caption}</Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Commit</Table.Th>
          <Table.Th>Change</Table.Th>
          <Table.Th>By</Table.Th>
          <Table.Th>When</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {history.map((commit) => (
          <Table.Tr key={commit.short_sha}>
            <Table.Td data-label="Commit">
              <code>{commit.short_sha}</code>
            </Table.Td>
            <Table.Td data-label="Change">{commit.subject}</Table.Td>
            <Table.Td data-label="By">
              <Box>
                {commit.author_name}
                <Text size="xs">{commit.author_email}</Text>
              </Box>
            </Table.Td>
            <Table.Td data-label="When">
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
  );
}
