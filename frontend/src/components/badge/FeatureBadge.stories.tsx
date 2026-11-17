/**
 * FeatureBadge Storybook Stories
 *
 * Demonstrates the FeatureBadge component with different labels.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import FeatureBadge from "./FeatureBadge";

const meta: Meta<typeof FeatureBadge> = {
  title: "Badge/Feature badge",
  component: FeatureBadge,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof FeatureBadge>;

/**
 * Default feature badges showing typical feature names
 */
export const Default: Story = {
  render: () => (
    <Group gap="md">
      <FeatureBadge label="Teaching" />
      <FeatureBadge label="Messaging" />
      <FeatureBadge label="Letters" />
    </Group>
  ),
};

/**
 * Removed state - features that have been removed
 */
export const Removed: Story = {
  render: () => (
    <Group gap="md">
      <FeatureBadge label="Teaching" removed />
      <FeatureBadge label="Messaging" removed />
      <FeatureBadge label="Letters" removed />
    </Group>
  ),
};
