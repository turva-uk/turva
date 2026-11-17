/**
 * AssignmentTable Component
 *
 * The officer's view of what is out with whom: each mitigation a member
 * has been asked to evidence, who asked, and since when. An assignment
 * closes when its mitigation is implemented or verified, so this lists
 * only what is still waiting.
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

function day(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const columns: Column<Assignment>[] = [
  {
    header: "Mitigation",
    render: (row) => `${row.mitigation_id}: ${row.mitigation_title}`,
  },
  { header: "With", render: (row) => row.assignee_name },
  { header: "Asked by", render: (row) => row.assigned_by_name },
  { header: "Since", render: (row) => day(row.assigned_at) },
];

export interface AssignmentTableProps {
  assignments: Assignment[];
}

export default function AssignmentTable({ assignments }: AssignmentTableProps) {
  return (
    <DataTableControlled
      searchFields={(row) => [row.mitigation_id, row.mitigation_title, row.assignee_name]}
      data={assignments}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyMessage="No mitigation is out with anybody."
    />
  );
}
