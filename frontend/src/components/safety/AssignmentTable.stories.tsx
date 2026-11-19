/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignmentTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

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

export const Unavailable: Story = {
  args: { assignments: SAMPLE_ASSIGNMENTS, error: "Assignments could not be read." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Assignments could not be read.")).toBeVisible();
    await expect(canvas.queryByText("No assignments were supplied.")).toBeNull();
  },
};

export const Default: Story = {};

export const NothingOut: Story = { args: { assignments: [] } };

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
