/**
 * ProcessStepTable Component
 *
 * Every step of a safety file's process, in order, each done or not and
 * what is still outstanding. Choosing a step opens its guidance. The
 * states arrive worked out from the file; nothing here decides one.
 *
 * @example
 * ```tsx
 * <ProcessStepTable steps={file.process.steps} onSelect={openGuide} />
 * ```
 *
 * Not yet in Turva's API: the template's process steps have no route yet, so this takes them as a prop.
 */

import { Badge } from "@mantine/core";
import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import { badgeColours, BADGE_VARIANT } from "@/components/badge/badgeColours";
import type { ProcessStep } from "@/lib/safety";

type Row = ProcessStep & { number: number };

function DoneBadge({ done }: { done: boolean }) {
  const colour = done ? badgeColours.success : badgeColours.neutral;

  return (
    <Badge color={colour.bg} c={colour.text} variant={BADGE_VARIANT}>
      {done ? "Done" : "Not yet"}
    </Badge>
  );
}

const columns: Column<Row>[] = [
  { header: "Step", render: (row) => row.number, width: "4rem" },
  { header: "What to do", render: (row) => row.title },
  { header: "State", render: (row) => <DoneBadge done={row.done} /> },
  {
    header: "Outstanding",
    render: (row) => row.reasons.join("; ") || "Nothing",
  },
];

export interface ProcessStepTableProps {
  steps: ProcessStep[];
  /** Called with a step's id when it is chosen */
  onSelect?: (stepId: string) => void;
}

export default function ProcessStepTable({ steps, onSelect }: ProcessStepTableProps) {
  const rows = steps.map((step, index) => ({ ...step, number: index + 1 }));

  return (
    <DataTableControlled
      searchFields={(row) => [row.title, ...row.reasons]}
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={onSelect ? (row) => onSelect(row.id) : undefined}
      emptyMessage="This file's template has no process."
    />
  );
}
