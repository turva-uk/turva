/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignmentTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import AssignmentTable from "./AssignmentTable";
import { SAMPLE_ASSIGNMENTS } from "@/test/safetyFile";

const meta: Meta<typeof AssignmentTable> = {
  decorators: [aheadOfTheApi("mitigation assignments")],
  title: "Safety/Assignment table",
  component: AssignmentTable,
  parameters: { layout: "padded" },
  args: { assignments: SAMPLE_ASSIGNMENTS },
};

export default meta;
type Story = StoryObj<typeof AssignmentTable>;

export const Default: Story = {};

export const NothingOut: Story = { args: { assignments: [] } };

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
