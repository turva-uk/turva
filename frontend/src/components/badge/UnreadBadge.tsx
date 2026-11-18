/**
 * Unread Badge Component
 *
 * Displays an unread message count as a filled circular badge.
 * Renders nothing when the count is zero or less.
 */

import { Skeleton } from "@mantine/core";
import classes from "./UnreadBadge.module.css";

type Props = {
  /** Number of unread messages */
  count: number;
  /** Show loading skeleton instead of badge */
  isLoading?: boolean;
};

/**
 * Unread Badge
 *
 * Shows a filled circular badge with the unread count.
 * Returns null when there are no unread messages.
 *
 * @example
 * ```tsx
 * <UnreadBadge count={3} />       // Shows blue circle with "3"
 * <UnreadBadge count={0} />       // Renders nothing
 * <UnreadBadge count={12} />      // Shows "9+"
 * ```
 */
export default function UnreadBadge({ count, isLoading = false }: Props) {
  if (isLoading) {
    return <Skeleton width={32} height={32} circle />;
  }

  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span className={classes.badge} aria-label={`${count} unread`}>
      {label}
    </span>
  );
}
