/**
 * InboxButton Component
 *
 * The envelope in the top ribbon: the way to the inbox, and, once Turva
 * has things to put there, how many are waiting. It is there whether or
 * not anything is waiting: an envelope that comes and goes is harder to
 * find when it matters than one that is always in the same place.
 *
 * Turva has nothing to count yet, so the ribbon passes no `count`, and
 * the envelope shows no number.
 *
 * @example
 * ```tsx
 * <InboxButton label="Inbox" onClick={() => navigate("/inbox")} />
 * ```
 */

import { ActionIcon } from "@mantine/core";

import Icon from "@/components/icons/Icon";
import { IconMail } from "@/components/icons/appIcons";
import classes from "./InboxButton.module.css";

export interface InboxButtonProps {
  /** What is behind the envelope, as a screen reader says it. The count is added to it. */
  label: string;
  /** How many things are waiting. Nothing is shown when there are none. */
  count?: number;
  /** Called when the envelope is pressed */
  onClick: () => void;
}

export default function InboxButton({ label, count = 0, onClick }: InboxButtonProps) {
  // The name carries the count, so a screen reader gets what the number
  // beside the envelope shows.
  const name = count > 0 ? `${label} (${count} waiting)` : label;

  return (
    <div className={classes.trigger}>
      <ActionIcon
        variant="transparent"
        className={classes.button}
        aria-label={name}
        onClick={onClick}
      >
        <Icon icon={<IconMail />} size="mlg" colour="var(--mantine-color-white)" />
      </ActionIcon>
      {count > 0 && (
        <span className={classes.count} data-testid="inbox-count">
          {count >= 10 ? "9+" : count}
        </span>
      )}
    </div>
  );
}
