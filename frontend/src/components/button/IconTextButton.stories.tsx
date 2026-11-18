/**
 * IconTextButton Storybook Stories
 *
 * Demonstrates the IconTextButton component with interaction states
 * and loading behaviour.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Group } from "@mantine/core";
import { StateRow, VariantRow, VariantStack } from "@/stories/variants";
import IconTextButton from "./IconTextButton";
import iconTextButtonIcons from "./iconTextButtonIcons";

const iconNames = Object.keys(iconTextButtonIcons) as Array<keyof typeof iconTextButtonIcons>;

const meta: Meta<typeof IconTextButton> = {
  title: "Button/Icon text button",
  component: IconTextButton,
  parameters: {
    layout: "padded",
  },
  args: {
    icon: "refresh",
    label: "Sync all",
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof IconTextButton>;

/** All registered icon types side-by-side. */
export const IconTypes: Story = {
  render: () => (
    <Group gap="lg">
      {iconNames.map((name) => (
        <IconTextButton key={name} icon={name} label={name} />
      ))}
    </Group>
  ),
};

const variants = ["filled", "light", "outline"] as const;

/** All variant styles side-by-side. */
export const Variants: Story = {
  render: () => (
    <VariantStack>
      {variants.map((v) => (
        <VariantRow key={v} label={v === "filled" ? "filled (default)" : v}>
          <IconTextButton icon="refresh" label="Sync all" variant={v} />
        </VariantRow>
      ))}
    </VariantStack>
  ),
};

/** All interaction states side-by-side. */
export const States: Story = {
  render: () => (
    <Group gap="xl">
      <StateRow label="default">
        <IconTextButton icon="refresh" label="Sync all" />
      </StateRow>
      <StateRow label="hover" state="hover">
        <IconTextButton icon="refresh" label="Sync all" />
      </StateRow>
      <StateRow label="active" state={["hover", "active"]}>
        <IconTextButton icon="refresh" label="Sync all" />
      </StateRow>
      <StateRow label="focus-visible" state="focus-visible">
        <IconTextButton icon="refresh" label="Sync all" />
      </StateRow>
      <StateRow label="disabled">
        <IconTextButton icon="refresh" label="Sync all" disabled />
      </StateRow>
    </Group>
  ),
};

export const DarkMode: Story = {
  ...IconTypes,
  globals: { colorScheme: "dark" },
};
