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
    render: (hazard) => <RiskScoreBadge assessment={hazard.initial} compact />,
    accessor: (hazard) => hazard.initial.risk_level,
  },
  {
    header: "Residual risk",
    render: (hazard) => <RiskScoreBadge assessment={hazard.residual} compact />,
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
  /** Called when a hazard is chosen */
  onSelect?: (hazard: Hazard) => void;
}

export default function HazardTable({ action, hazards, onSelect }: HazardTableProps) {
  return (
    <DataTableControlled
      action={action}
      searchFields={(hazard) => [hazard.id, hazard.title, hazard.cause]}
      data={hazards}
      columns={columns}
      getRowKey={(hazard) => hazard.id}
      onRowClick={onSelect}
      emptyMessage="No hazards in the log. An empty hazard log is not evidence of a safe system."
    />
  );
}
