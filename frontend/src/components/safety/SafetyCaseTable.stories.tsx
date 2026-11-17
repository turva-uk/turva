/**
 * SafetyCaseTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SafetyCaseTable from "./SafetyCaseTable";
import { SAMPLE_FILES } from "@/test/safetyFile";

const meta: Meta<typeof SafetyCaseTable> = {
  title: "Safety/Safety case table",
  component: SafetyCaseTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SafetyCaseTable>;

export const Default: Story = {
  args: { cases: SAMPLE_FILES, onSelect: fn() },
};

export const Empty: Story = {
  args: { cases: [], onSelect: fn() },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
