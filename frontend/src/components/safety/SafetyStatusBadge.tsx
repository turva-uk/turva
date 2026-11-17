/**
 * SafetyStatusBadge Component
 *
 * Where a safety file stands: a draft, approved by its Clinical Safety
 * Officer, or accepted by Top Management for go-live. Read from the
 * file's sign-off tags by the backend, never stored, so any change after
 * a sign-off shows as a draft again.
 *
 * Not yet in Turva's API: a file's status comes from sign-off, which has no route yet, so this takes the status as a prop.
 */

import { Badge } from "@mantine/core";
import {
  badgeColours,
  BADGE_VARIANT,
  type BadgeColourConfig,
} from "@/components/badge/badgeColours";
import type { SafetyFileStatus } from "@/lib/safety";

type Props = {
  /** Where the file stands */
  status: SafetyFileStatus;
};

const STATUS_CONFIG: Record<SafetyFileStatus, { label: string; colour: BadgeColourConfig }> = {
  draft: { label: "Draft", colour: badgeColours.neutral },
  approved: { label: "Approved by the CSO", colour: badgeColours.warning },
  accepted: { label: "Accepted for go-live", colour: badgeColours.success },
};

export default function SafetyStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge color={config.colour.bg} c={config.colour.text} variant={BADGE_VARIANT}>
      {config.label}
    </Badge>
  );
}
