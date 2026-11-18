/**
 * ActiveStatus Badge Component
 *
 * Displays the active/inactive status of a resource (a user, a safety file and so on)
 * with appropriate colour coding and sizing.
 */

import { Badge } from "@mantine/core";
import { badgeColours, BADGE_VARIANT, type BadgeColourConfig } from "./badgeColours";
import BadgeSkeleton from "./BadgeSkeleton";

type Props = {
  /** Whether the resource is active */
  active: boolean;
  /** Show loading skeleton instead of badge */
  isLoading?: boolean;
  /** What an inactive one is called where "Inactive" is not the word: a
   * site is "Deactivated" */
  inactiveLabel?: string;
};

const STATUS_CONFIG: Record<
  "active" | "inactive",
  { label: string; colour: BadgeColourConfig }
> = {
  active: { label: "Active", colour: badgeColours.success },
  inactive: { label: "Inactive", colour: badgeColours.outstanding },
};

export default function ActiveStatusBadge({ active, isLoading = false, inactiveLabel }: Props) {
  if (isLoading) {
    return <BadgeSkeleton />;
  }

  const { label: named, colour } = STATUS_CONFIG[active ? "active" : "inactive"];
  const label = !active && inactiveLabel ? inactiveLabel : named;

  return (
    <Badge color={colour.bg} c={colour.text} variant={BADGE_VARIANT}>
      {label}
    </Badge>
  );
}
