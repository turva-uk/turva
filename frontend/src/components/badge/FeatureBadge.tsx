/**
 * FeatureBadge Component
 *
 * Displays a feature name as a pill-shaped badge using the
 * warning colour from the design system.
 *
 * @example
 * ```tsx
 * <FeatureBadge label="Teaching" />
 * <FeatureBadge label="Messaging" />
 * ```
 */

import { Badge } from "@mantine/core";
import { badgeColours, BADGE_VARIANT } from "./badgeColours";
import BadgeSkeleton from "./BadgeSkeleton";

interface FeatureBadgeProps {
  /** Feature display name */
  label: string;
  /** Show loading skeleton instead of badge */
  isLoading?: boolean;
  /** Feature has been removed */
  removed?: boolean;
}

/**
 * FeatureBadge displays a feature name with consistent
 * colour coding. Accent by default, alert when removed.
 */
export default function FeatureBadge({
  label,
  isLoading = false,
  removed = false,
}: FeatureBadgeProps) {
  if (isLoading) {
    return <BadgeSkeleton />;
  }

  const colour = removed ? badgeColours.alert : badgeColours.accent;

  return (
    <Badge variant={BADGE_VARIANT} color={colour.bg} c={colour.text} radius="xl">
      {label}
    </Badge>
  );
}
