/**
 * AssignmentTable Component
 *
 * The officer's view of what is out with whom: each mitigation a member
 * has been asked to evidence, who asked, and since when. Its rows are
 * supplied by the caller. This view cannot establish that all
 * assignments were read or that a mitigation is complete.
 *
 * @example
 * ```tsx
 * <AssignmentTable assignments={file.assignments ?? []} />
 * ```
 *
 * Not yet in Turva's API: mitigation assignments have no route yet, so this takes them as a prop.
 */

import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import type { Assignment } from "@/lib/safety";
import { BodyText } from "@/components/typography";

function AssignedAt({ value }: { value: string }) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()))
    return (
      <BodyText preserveLines>
        Assignment time unavailable. Recorded value: {value || "Not supplied"}.
      </BodyText>
    );
  return (
    <time dateTime={value} title={value}>
      {instant.toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })}
    </time>
  );
}

const columns: Column<Assignment>[] = [
  {
    header: "Mitigation",
    render: (row) => `${row.mitigation_id}: ${row.mitigation_title}`,
  },
  { header: "With", render: (row) => row.assignee_name },
  { header: "Asked by", render: (row) => row.assigned_by_name },
  { header: "Since (UTC)", render: (row) => <AssignedAt value={row.assigned_at} /> },
];

export interface AssignmentTableProps {
  assignments: Assignment[];
  loading?: boolean;
  error?: string | null;
}

export default function AssignmentTable({ assignments, loading, error }: AssignmentTableProps) {
  return (
    <DataTableControlled
      searchFields={(row) => [row.mitigation_id, row.mitigation_title, row.assignee_name]}
      data={assignments}
      loading={loading}
      error={error}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyMessage="No assignments were supplied."
    />
  );
}
