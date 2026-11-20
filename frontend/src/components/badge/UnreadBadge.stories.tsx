/**
 * UnreadBadge Storybook Stories
 *
 * Demonstrates the UnreadBadge component with various counts.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import UnreadBadge from "./UnreadBadge";

const meta: Meta<typeof UnreadBadge> = {
  title: "Badge/Unread badge",
  component: UnreadBadge,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof UnreadBadge>;

const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const Default: Story = {
  render: () => (
    <Group gap="md">
      {counts.map((count) => (
        <UnreadBadge key={count} count={count} />
      ))}
    </Group>
  ),
};

/** Loading skeleton. */
export const Loading: Story = {
  render: () => <UnreadBadge count={1} isLoading />,
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
