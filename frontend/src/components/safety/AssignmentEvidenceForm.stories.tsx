/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignmentEvidenceForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
import AssignmentEvidenceForm from "./AssignmentEvidenceForm";
import { SAMPLE_MY_ASSIGNMENT } from "@/test/safetyFile";

const meta: Meta<typeof AssignmentEvidenceForm> = {
  decorators: [aheadOfTheApi("mitigation assignments")],
  title: "Safety/Assignment evidence form",
  component: AssignmentEvidenceForm,
  parameters: { layout: "padded" },
  args: { assignment: SAMPLE_MY_ASSIGNMENT, onSubmit: fn(), onCancel: fn() },
};

export default meta;
type Story = StoryObj<typeof AssignmentEvidenceForm>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: "Somebody else saved this file after you opened it." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
