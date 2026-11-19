/**
 * Badge Skeleton
 *
 * Shared loading skeleton for all badge components (except UnreadBadge).
 * Uses a fixed size matching the single badge size from the theme.
 */

import { Skeleton } from "@mantine/core";

export default function BadgeSkeleton() {
  return <Skeleton width={90} height={27} radius="xl" />;
}
