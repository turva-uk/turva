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
  parameters: { routerPath: "/organisations" },
};

/** On a page beneath the link's address, so it is marked as current. */
export const Current: Story = {
  parameters: { routerPath: "/safety-files/demo-bp-at-home" },
};

/** Beneath another link, such as "Your profile" under "Settings": indented, with no icon. */
export const Nested: Story = {
  args: { to: "/settings/profile", label: "Your profile", icon: undefined, level: 1 },
  parameters: { routerPath: "/settings/profile" },
};

/** Beneath a sublink, such as "File team" under a safety file: indented once more. */
export const NestedTwice: Story = {
  args: {
    to: "/safety-files/demo-bp-at-home/team",
    label: "File team",
    icon: undefined,
    level: 2,
  },
  parameters: { routerPath: "/safety-files/demo-bp-at-home/team" },
};

export const DarkMode: Story = {
  parameters: { routerPath: "/safety-files" },
  globals: { colorScheme: "dark" },
};
