/**
 * ExtraButton Component
 *
 * An icon-only control for the row above a table, beside its search and
 * filter icons: `DataTableControlled`'s `action` slot. It is the extra
 * thing a table can do, whatever that is: add a record, add a person,
 * grant a competency, open somebody's account. It was called
 * `AddIconButton` until it came to be used for things that add nothing.
 * Subtle and primary, at the same size and stroke as the other two, so
 * it sits with them rather than shouting over them.
 *
 * The label is required because the button shows only an icon: without
 * it a screen reader announces "button" and nothing else. The same words
 * show as a tooltip on hover and focus.
 *
 * @example
 * ```tsx
 * <DataTableControlled
 *   action={<ExtraButton aria-label="Add hazard" onClick={add} />}
 *   ...
 * />
 * ```
 */

import { cloneElement, type MouseEventHandler, type ReactElement } from "react";
import { ActionIcon, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { IconProps as TablerIconProps } from "@tabler/icons-react";
import { IconFilePlus } from "@/components/icons/appIcons";
import AppTooltip from "@/components/tooltip/AppTooltip";

interface ExtraButtonProps {
  /** What the button does, read out by screen readers: "Add hazard" */
  "aria-label": string;
  /**
   * The icon, from `appIcons.ts`. Defaults to `IconFilePlus`, a new
   * record in a file; a table of people passes `IconUserPlus`.
   */
  icon?: ReactElement;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

/**
 * Drawn the way `SearchButton` and `FilterSelect` draw theirs, with the
 * same `ActionIcon` size and icon size, and a stroke that matches their
 * visual weight, so the three icons in a table's row read as one set. `IconButton` would give it a
 * thinner stroke and a different footprint, which is why `ActionIcon` is
 * used directly here, with the aria-label still required.
 */
export default function ExtraButton({
  "aria-label": label,
  icon = <IconFilePlus />,
  onClick,
  disabled = false,
}: ExtraButtonProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });
  // The search and filter icons are drawn at stroke 2.5, but they are
  // simple glyphs. A file or person with a plus has more lines in the
  // same box, and at 2.5 it read as heavier than its neighbours; Tabler's
  // default of 2 makes the three look the same weight. Same size as the
  // other two.
  // A Tabler icon, as in `Icon`, which says why the element is narrowed
  const sized = cloneElement(icon as ReactElement<TablerIconProps>, {
    size: 32,
    stroke: 2,
  });

  // The same words as the aria-label, so sighted users get the hint
  // a screen reader user already has.
  return (
    <AppTooltip label={label} position="bottom">
      <ActionIcon
        variant="subtle"
        color="primary"
        size={isMobile ? 44 : "lg"}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {sized}
      </ActionIcon>
    </AppTooltip>
  );
}
