import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { fn } from "storybook/test";

import LogoutNavLink from "./LogoutNavLink";

const meta: Meta<typeof LogoutNavLink> = {
  title: "Layout/Side navigation/Sign out",
  component: LogoutNavLink,
  parameters: { layout: "padded" },
  args: { onSignOut: fn() },
  decorators: [
    (Story) => (
      <Box w="16rem">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LogoutNavLink>;

export const Default: Story = {};

/** Signing out is under way, so it says so and cannot be pressed again. */
export const SigningOut: Story = {
  args: { signingOut: true },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
