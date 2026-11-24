import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";

import SideNavLink from "./SideNavLink";

const meta: Meta<typeof SideNavLink> = {
  title: "Layout/Side navigation/Link",
  component: SideNavLink,
  parameters: { layout: "padded" },
  args: { to: "/safety-files", label: "Safety files", icon: "safety" },
  decorators: [
    (Story) => (
      <Box w="16rem">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SideNavLink>;

/** Not the current page. */
export const Default: Story = {
  parameters: { routerPath: "/profile" },
};

/** On a page beneath the link's address, so it is marked as current. */
export const Current: Story = {
  parameters: { routerPath: "/safety-files/demo-bp-at-home" },
};

export const DarkMode: Story = {
  parameters: { routerPath: "/safety-files" },
  globals: { colorScheme: "dark" },
};
