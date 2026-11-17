/**
 * SafetyCaseTable Component
 *
 * The safety files a person may open: each with its organisation, the
 * standard it is written against, whether it is public, and when it was
 * made. A public file from another organisation is listed too, so it can
 * be read and learnt from.
 *
 * Turva's files have no status yet, so there is no status column. Quill's
 * draft, approved and accepted come from sign-off, which Turva's API does
 * not have; `SafetyStatusBadge` shows them, ahead of it.
 */

import type { ReactNode } from "react";

import FormattedDate from "@/components/data/Date";
import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import type { SafetyFile } from "@/lib/safety";

const columns: Column<SafetyFile>[] = [
  {
    header: "Safety file",
    render: (file) => file.name,
    accessor: (file) => file.name,
  },
  {
    header: "Organisation",
    render: (file) => file.organisation,
    accessor: (file) => file.organisation,
  },
  {
    header: "Standard",
    render: (file) => file.standard,
    accessor: (file) => file.standard,
  },
  {
    header: "Visibility",
    render: (file) => (file.visibility === "public" ? "Public" : "Private"),
    accessor: (file) => file.visibility,
  },
  {
    header: "Created",
    render: (file) => <FormattedDate date={file.created_at} format="medium" />,
    accessor: (file) => file.created_at,
  },
];

export interface SafetyCaseTableProps {
  /**
   * The table's own action, such as an add button, shown in the row with
   * search and filter. See `DataTableControlled`.
   */
  action?: ReactNode;
  /** The files, in the order to show them */
  cases: readonly SafetyFile[];
  /** Called when a file is chosen */
  onSelect?: (file: SafetyFile) => void;
}

export default function SafetyCaseTable({ action, cases, onSelect }: SafetyCaseTableProps) {
  return (
    <DataTableControlled
      action={action}
      searchFields={(file) => [file.name, file.organisation, file.standard]}
      data={[...cases]}
      columns={columns}
      getRowKey={(file) => file.slug}
      onRowClick={onSelect}
      emptyMessage="No safety files yet"
    />
  );
}
