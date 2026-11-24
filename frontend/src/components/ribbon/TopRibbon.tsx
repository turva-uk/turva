/**
 * TopRibbon Component
 *
 * The band across the top of every page. On a wide screen it carries the
 * Turva wordmark, which links home; on a narrow screen the burger button
 * that opens the navigation drawer takes its place, so the two never show
 * together. Anything in `end`, such as the inbox envelope, sits on the
 * right. The main navigation itself lives in the side bar.
 *
 * @example
 * ```tsx
 * <TopRibbon showBurger={collapsed} navOpen={opened} onBurgerClick={toggle} />
 * ```
 */

import { Anchor, Box, Group } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";

import BurgerButton from "@/components/button/BurgerButton";
import classes from "./TopRibbon.module.css";

export interface TopRibbonProps {
  /** Show the burger button: true on a narrow screen with somebody signed in */
  showBurger?: boolean;
  /** Whether the navigation drawer is open, for the burger's label */
  navOpen?: boolean;
  /** Called when the burger button is pressed */
  onBurgerClick?: () => void;
  /** What sits on the right of the ribbon, such as the inbox envelope */
  end?: ReactNode;
}

export default function TopRibbon({
  showBurger = false,
  navOpen = false,
  onBurgerClick,
  end,
}: TopRibbonProps) {
  const burger = showBurger && onBurgerClick;

  return (
    <Group className={classes.band} gap="sm" wrap="nowrap">
      {burger ? (
        <BurgerButton navOpen={navOpen} onClick={onBurgerClick} />
      ) : (
        <Anchor component={Link} to="/" underline="never" className={classes.home}>
          Turva
        </Anchor>
      )}
      {end && <Box className={classes.end}>{end}</Box>}
    </Group>
  );
}
