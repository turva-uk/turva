/**
 * CardActionRow Component
 *
 * The inside of a card that has text on the left and an action on the
 * right: a name beside an edit icon, a title beside a menu. Use it as
 * the child of `BaseCard` whenever a card carries one control.
 *
 * It exists because the obvious layout, a `Group` with `wrap="nowrap"`,
 * goes wrong on a narrow card: the text refuses to be narrower than its
 * longest word, an email address say, and the action is pushed out of
 * the card. This row lets the text shrink and break long words, and
 * keeps the action at its full size, so the control stays inside the
 * card at every width. See the "Narrow" story.
 *
 * @example
 * ```tsx
 * <BaseCard>
 *   <CardActionRow
 *     action={<IconButton icon={<IconPencil />} aria-label="Edit" />}
 *   >
 *     <BodyTextBold>Clinical safety officer</BodyTextBold>
 *     <BodyText>Dr Hannah Okafor</BodyText>
 *   </CardActionRow>
 * </BaseCard>
 * ```
 */

import type { ReactNode } from "react";
import { Group, Stack, type MantineSpacing } from "@mantine/core";
import classes from "./CardActionRow.module.css";

export interface CardActionRowProps {
  /** The text, stacked top to bottom on the left */
  children: ReactNode;
  /** The control on the right. Omit it and the row is just the text. */
  action?: ReactNode;
  /** Space between the lines of text. Default: "xs" */
  gap?: MantineSpacing;
  /**
   * Where the action sits against the text. "start" (the default) puts
   * an icon level with the first line; "center" suits a badge beside a
   * single line.
   */
  align?: "start" | "center";
}

export default function CardActionRow({
  children,
  action,
  gap = "xs",
  align = "start",
}: CardActionRowProps) {
  return (
    <Group
      justify="space-between"
      align={align === "start" ? "flex-start" : "center"}
      wrap="nowrap"
      data-testid="card-action-row"
    >
      <Stack gap={gap} className={classes.text}>
        {children}
      </Stack>
      {action && <div className={classes.action}>{action}</div>}
    </Group>
  );
}
