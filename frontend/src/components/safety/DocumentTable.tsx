/**
 * DocumentTable Component
 *
 * The prose documents a safety file holds, each by its title and where it
 * sits in the file: the overview, the clinical risk management plan and
 * the safety case report, as the template made them. Their history is the
 * file's; a document has no version of its own beyond its commits.
 *
 * Not yet in Turva's API: the file's prose documents have no route yet, so this takes them as a prop.
 */

import type { ReactNode } from "react";
import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import type { DocumentRef } from "@/lib/safety";

const columns: Column<DocumentRef>[] = [
  {
    header: "Document",
    render: (document) => document.title,
    accessor: (document) => document.title,
  },
  {
    header: "File",
    render: (document) => document.path,
    accessor: (document) => document.path,
  },
];

export interface DocumentTableProps {
  /**
   * The table's own action, shown in the row with search and filter. See
   * `DataTableControlled`.
   */
  action?: ReactNode;
  documents: DocumentRef[];
  /** Called when a document is chosen */
  onSelect?: (document: DocumentRef) => void;
}

export default function DocumentTable({ action, documents, onSelect }: DocumentTableProps) {
  return (
    <DataTableControlled
      action={action}
      searchFields={(document) => [document.title, document.path]}
      data={documents}
      columns={columns}
      getRowKey={(document) => document.path}
      onRowClick={onSelect}
      emptyMessage="No documents in this safety file"
    />
  );
}
