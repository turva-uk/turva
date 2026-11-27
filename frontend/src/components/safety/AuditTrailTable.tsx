/**
 * AuditTrailTable Component
 *
 * A safety file's audit trail: each commit with its short reference, what
 * it changed, who made it and when. Every change to a safety file is a
 * commit attributed to the person who made it, so this is the record a
 * regulator or a court would examine.
 *
 * The safety file, hazard and mitigation pages each show one.
 *
 * @example
 * ```tsx
 * <AuditTrailTable history={detail.history} label="Change history" />
 * ```
 */

import { Stack } from "@mantine/core";

import DataTable from "@/components/tables/DataTable";
import type { Column } from "@/components/tables/DataTable";
import { BodyTextInline } from "@/components/typography";
import type { Commit } from "@/lib/safety";

const columns: Column<Commit>[] = [
  {
    header: "Commit",
    render: (commit) => <code>{commit.short_sha}</code>,
    width: "8rem",
  },
  {
    header: "Change",
    render: (commit) => commit.subject,
  },
  {
    header: "By",
    render: (commit) => (
      <Stack gap={0}>
        <BodyTextInline>{commit.author_name}</BodyTextInline>
        <BodyTextInline c="dimmed">{commit.author_email}</BodyTextInline>
      </Stack>
    ),
  },
  {
    header: "When",
    render: (commit) => (
      <time dateTime={commit.committed_at}>
        {new Date(commit.committed_at).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </time>
    ),
  },
];

export interface AuditTrailTableProps {
  /** The commits, newest first, as the server sends them */
  history: readonly Commit[];
  /** The table's name for a screen reader, not shown on screen */
  label: string;
}

export default function AuditTrailTable({ history, label }: AuditTrailTableProps) {
  return (
    <DataTable<Commit>
      data={[...history]}
      columns={columns}
      getRowKey={(commit) => commit.short_sha}
      label={label}
      emptyMessage="No changes recorded yet."
    />
  );
}
