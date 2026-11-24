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

import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import type { SafetyFile } from "@/lib/safety";

const columns: Column<SafetyFile>[] = [
  {
    header: "System",
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
    header: "Created (UTC)",
    // created_at is an instant, not a YYYY-MM-DD safety-record calendar date.
    render: (file) => (
      <time dateTime={file.created_at} title={file.created_at}>
        {new Date(file.created_at).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}
      </time>
    ),
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
  error?: string | null;
  loading?: boolean;
  /** Called when a file is chosen */
  onSelect?: (file: SafetyFile) => void;
  /** The table's name for a screen reader, not shown on screen */
  label?: string;
  /** What to say when there are no files */
  emptyMessage?: string;
}

export default function SafetyCaseTable({
  action,
  cases,
  onSelect,
  error,
  loading,
  label,
  emptyMessage = "No safety files yet",
}: SafetyCaseTableProps) {
  return (
    <DataTableControlled
      action={action}
      searchFields={(file) => [file.name, file.organisation, file.standard]}
      data={[...cases]}
      error={error}
      loading={loading}
      columns={columns}
      getRowKey={(file) => file.slug}
      onRowClick={onSelect}
      label={label}
      emptyMessage={emptyMessage}
    />
  );
}
