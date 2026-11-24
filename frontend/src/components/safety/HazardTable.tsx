/**
 * HazardTable Component
 *
 * A safety file's hazard log: each hazard with its cause, its risk level
 * before and after mitigation, and where it stands. The levels arrive
 * derived by the server and are shown by `RiskScoreBadge`, number and
 * words together.
 */

import { Badge } from "@mantine/core";
import type { ReactNode } from "react";

import {
  badgeColours,
  BADGE_VARIANT,
  type BadgeColourConfig,
} from "@/components/badge/badgeColours";
import { type Column } from "@/components/tables/DataTable";
import DataTableControlled from "@/components/tables/DataTableControlled";
import { isHazardStatus, type Hazard, type HazardStatus } from "@/lib/safety";

import RiskScoreBadge from "./RiskScoreBadge";

const STATUS: Record<HazardStatus, { label: string; colour: BadgeColourConfig }> = {
  open: { label: "Open", colour: badgeColours.alert },
  transferred: { label: "Transferred", colour: badgeColours.neutral },
  closed: { label: "Closed", colour: badgeColours.success },
};

/**
 * Turva sends the status as a string. One it does not know is shown as
 * it came, in the neutral colour, rather than as one it is not.
 */
function StatusBadge({ hazard }: { hazard: Hazard }) {
  const { label, colour } = isHazardStatus(hazard.status)
    ? STATUS[hazard.status]
    : { label: hazard.status, colour: badgeColours.neutral };

  return (
    <Badge color={colour.bg} c={colour.text} variant={BADGE_VARIANT}>
      {label}
    </Badge>
  );
}

const columns: Column<Hazard>[] = [
  {
    header: "Ref",
    render: (hazard) => hazard.id,
    accessor: (hazard) => hazard.id,
    // Room for "HAZ-002" on one line: at 6rem it broke at the hyphen.
    width: "7.5rem",
  },
  {
    header: "Hazard",
    render: (hazard) => hazard.title,
    accessor: (hazard) => hazard.title,
  },
  {
    header: "Cause",
    render: (hazard) => hazard.cause,
  },
  {
    header: "Initial risk",
    render: (hazard) => <RiskScoreBadge assessment={hazard.initial} withScores />,
    accessor: (hazard) => hazard.initial.risk_level,
  },
  {
    header: "Residual risk",
    render: (hazard) => <RiskScoreBadge assessment={hazard.residual} withScores />,
    accessor: (hazard) => hazard.residual.risk_level,
  },
  {
    header: "Status",
    render: (hazard) => <StatusBadge hazard={hazard} />,
    accessor: (hazard) => hazard.status,
  },
];

export interface HazardTableProps {
  /**
   * The table's own action, such as an add button, shown in the row with
   * search and filter. See `DataTableControlled`.
   */
  action?: ReactNode;
  hazards: Hazard[];
  /** Keep unavailable evidence distinct from a successful empty log. */
  error?: string | null;
  loading?: boolean;
  /** Called when a hazard is chosen */
  onSelect?: (hazard: Hazard) => void;
  /** The table's name for a screen reader, not shown on screen */
  label?: string;
  /** What to say when the log is empty */
  emptyMessage?: string;
}

/** The status words the filter offers, in the order they are offered. */
const STATUS_FILTERS = Object.values(STATUS).map((status) => status.label);

/** The words a hazard's status shows as, a status Turva does not know included. */
function statusLabel(hazard: Hazard): string {
  return isHazardStatus(hazard.status) ? STATUS[hazard.status].label : hazard.status;
}

export default function HazardTable({
  action,
  hazards,
  onSelect,
  error,
  loading,
  label,
  emptyMessage = "No hazards in the log. An empty hazard log is not evidence of a safe system.",
}: HazardTableProps) {
  return (
    <DataTableControlled
      action={action}
      searchFields={(hazard) => [hazard.id, hazard.title, hazard.cause, hazard.harm]}
      filterData={STATUS_FILTERS}
      filterLabel="Hazard status"
      filterAriaLabel="Filter by hazard status"
      filterPredicate={(filters) => (hazard) =>
        filters.length === 0 || filters.includes(statusLabel(hazard))
      }
      data={hazards}
      error={error}
      loading={loading}
      columns={columns}
      getRowKey={(hazard) => hazard.id}
      onRowClick={onSelect}
      label={label}
      emptyMessage={emptyMessage}
    />
  );
}
