import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { fn } from "storybook/test";

import InboxButton from "./InboxButton";

const meta: Meta<typeof InboxButton> = {
  title: "Layout/Inbox button",
  component: InboxButton,
  parameters: { layout: "padded" },
  args: { label: "Inbox", onClick: fn() },
  // The envelope is drawn for the ribbon, so the stories put it on one.
  decorators: [
    (Story) => (
      <Box bg="var(--ribbon-bg, var(--brand-primary))" p="md" w="fit-content">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InboxButton>;

/** Nothing waiting, as in Turva today. */
export const Empty: Story = {};

/** Three things waiting. */
export const Waiting: Story = {
  args: { count: 3 },
};

/** Ten or more waiting. */
export const Many: Story = {
  args: { count: 12 },
};

export const DarkMode: Story = {
  args: { count: 3 },
  globals: { colorScheme: "dark" },
};
