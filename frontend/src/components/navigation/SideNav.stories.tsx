import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { fn } from "storybook/test";

import { LAYOUT_SIDEBAR_WIDTH } from "@/components/layouts/layoutConstants";
import SideNav from "./SideNav";

const meta: Meta<typeof SideNav> = {
  title: "Layout/Side navigation",
  component: SideNav,
  parameters: { layout: "padded" },
  args: { onSignOut: fn(), onNavigate: fn() },
  decorators: [
    (Story) => (
      <Box w={LAYOUT_SIDEBAR_WIDTH} h="24rem">
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

/** Signing out is under way. */
export const SigningOut: Story = {
  args: { signingOut: true },
};

export const DarkMode: Story = {
  parameters: { routerPath: "/profile" },
  globals: { colorScheme: "dark" },
};
