/**
 * SortChevron Component
 *
 * A compact directional indicator using chevrons. Shows ascending (up),
 * descending (down), or neutral (both) states. Used in sortable table
 * headers and as the dropdown indicator in select fields.
 */

import { IconChevronDown, IconChevronUp } from "@/components/icons/appIcons";
import Icon from "@/components/icons/Icon";
import classes from "./SortChevron.module.css";

export type ChevronDirection = "up" | "down" | "neutral";

export interface SortChevronProps {
  /** Which direction to indicate */
  direction: ChevronDirection;
}

export default function SortChevron({ direction }: SortChevronProps) {
  return (
    <span className={classes.wrapper} aria-hidden="true">
      <span className={direction === "up" ? classes.active : classes.inactive}>
        <Icon icon={<IconChevronUp />} size="sm" />
      </span>
      <span className={direction === "down" ? classes.active : classes.inactive}>
        <Icon icon={<IconChevronDown />} size="sm" />
      </span>
    </span>
  );
}
