import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { fn } from "storybook/test";

import { LAYOUT_SIDEBAR_WIDTH } from "@/components/layouts/layoutConstants";
import SideNav from "./SideNav";

const meta: Meta<typeof SideNav> = {
  title: "Layout/Side navigation",
  component: SideNav,
  // Full screen, as the side bar runs from the ribbon to the bottom of the
  // screen in the app, so "Sign out" sits at the very foot of the frame.
  parameters: { layout: "fullscreen" },
  args: { onSignOut: fn(), onNavigate: fn() },
  decorators: [
    (Story) => (
      <Box w={LAYOUT_SIDEBAR_WIDTH} h="100dvh">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SideNav>;

/** The three links, with Sign out at the foot. */
export const Default: Story = {};

/** Reading a hazard: "Safety files" is marked as the current section. */
export const InASafetyFile: Story = {
  parameters: { routerPath: "/safety-files/demo-bp-at-home/hazards/HAZ-001" },
};

/** On "Your profile": it shows beneath Settings, marked as the current page. */
export const InSettings: Story = {
  parameters: { routerPath: "/settings/profile" },
};

/** Signing out is under way. */
export const SigningOut: Story = {
  args: { signingOut: true },
};

export const DarkMode: Story = {
  parameters: { routerPath: "/settings/profile" },
  globals: { colorScheme: "dark" },
};
