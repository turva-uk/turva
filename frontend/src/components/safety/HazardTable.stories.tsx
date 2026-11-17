/**
 * HazardTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import HazardTable from "./HazardTable";
import { SAMPLE_HAZARDS } from "@/test/safetyFile";

const meta: Meta<typeof HazardTable> = {
  title: "Safety/Hazard table",
  component: HazardTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof HazardTable>;

export const Default: Story = {
  args: { hazards: SAMPLE_HAZARDS, onSelect: fn() },
};

export const Empty: Story = { args: { hazards: [] } };

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
