import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import NavigationDrawer from "@/components/drawers/NavigationDrawer";
import { LAYOUT_RIBBON_HEIGHT } from "@/components/layouts/layoutConstants";
import SideNav from "@/components/navigation/SideNav";
import TopRibbon from "./TopRibbon";

const meta: Meta<typeof TopRibbon> = {
  title: "Layout/Top ribbon",
  component: TopRibbon,
  parameters: { layout: "fullscreen" },
  args: { onBurgerClick: fn() },
  // The ribbon fills whatever holds it. In the app that is the shell's
  // header, at the ribbon's height, so the stories hold it at that height
  // too, rather than letting it shrink to its text.
  decorators: [
    (Story) => (
      <Box h={LAYOUT_RIBBON_HEIGHT}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TopRibbon>;

/** A wide screen: the Turva name alone. The navigation is in the side bar. */
export const Wide: Story = {};

/** A narrow screen: the burger opens the navigation drawer. */
export const WithBurger: Story = {
  args: { showBurger: true },
};

/**
 * The drawer is open, so the burger offers to close it. The drawer is
 * drawn too, since the burger names it as the thing it controls.
 */
export const DrawerOpen: Story = {
  args: { showBurger: true, navOpen: true },
  render: (args) => (
    <>
      <TopRibbon {...args} />
      <NavigationDrawer opened onClose={fn()}>
        <SideNav onSignOut={fn()} />
      </NavigationDrawer>
    </>
  ),
};

export const DarkMode: Story = {
  args: { showBurger: true },
  globals: { colorScheme: "dark" },
};
