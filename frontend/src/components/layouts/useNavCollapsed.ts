/**
 * Whether the side bar is folded away behind the burger button.
 *
 * Below the theme's `md` breakpoint, not `sm`: a tablet held upright is
 * wider than a phone but too narrow to give the side bar its width and
 * still leave room for the page. When this is true the ribbon shows the
 * burger, and the side bar opens as a drawer instead.
 */

import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export function useNavCollapsed(): boolean {
  const theme = useMantineTheme();

  return useMediaQuery(`(max-width: ${theme.breakpoints.md})`) ?? false;
}
