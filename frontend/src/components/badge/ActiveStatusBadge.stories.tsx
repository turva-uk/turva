/**
 * ActiveStatus Badge Storybook Stories
 *
 * Demonstrates the ActiveStatus component in various states.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import ActiveStatusBadge from "./ActiveStatusBadge";

const meta: Meta<typeof ActiveStatusBadge> = {
  title: "Badge/Active status badge",
  component: ActiveStatusBadge,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    active: {
      control: "boolean",
      description: "Whether the resource is active",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ActiveStatusBadge>;

/**
 * Shows both active and deactivated states.
 */
export const Default: Story = {
  render: () => (
    <Group gap="md">
      <ActiveStatusBadge active={true} />
      <ActiveStatusBadge active={false} />
      <ActiveStatusBadge active={false} inactiveLabel="Deactivated" />
    </Group>
  ),
};
