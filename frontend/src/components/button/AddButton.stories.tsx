/**
 * AddButton Storybook Stories
 *
 * Demonstrates the AddButton component with real pseudo states.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import AddButton from "./AddButton";
import { StateRow } from "@/stories/variants";
import { Group } from "@mantine/core";

const meta: Meta<typeof AddButton> = {
  title: "Button/Add button",
  component: AddButton,
  parameters: {
    layout: "padded",
  },
  args: {
    label: "Add user",
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AddButton>;

/** Default interactive AddButton. */
export const Default: Story = {};

/** All interaction states side-by-side. */
export const States: Story = {
  render: () => (
    <Group gap="xl">
      <StateRow label="default">
        <AddButton label="Add user" />
      </StateRow>
      <StateRow label="hover" state="hover">
        <AddButton label="Add user" />
      </StateRow>
      <StateRow label="active" state={["hover", "active"]}>
        <AddButton label="Add user" />
      </StateRow>
      <StateRow label="focus-visible" state="focus-visible">
        <AddButton label="Add user" />
      </StateRow>
      <StateRow label="disabled">
        <AddButton label="Add user" disabled />
      </StateRow>
    </Group>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
