/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignMitigationForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
import AssignMitigationForm from "./AssignMitigationForm";
import {
  SAMPLE_ASSIGNMENTS,
  SAMPLE_MEMBERS,
  SAMPLE_MITIGATIONS,
  FLAGGING_MITIGATION,
} from "@/test/safetyFile";

const meta: Meta<typeof AssignMitigationForm> = {
  decorators: [aheadOfTheApi("mitigation assignments")],
  title: "Safety/Assign mitigation form",
  component: AssignMitigationForm,
  parameters: { layout: "padded" },
  args: {
    mitigations: [
      ...SAMPLE_MITIGATIONS,
      {
        ...FLAGGING_MITIGATION,
        id: "MIT-002",
        title: "Daily safety-netting report",
        status: "proposed",
      },
    ],
    assignments: SAMPLE_ASSIGNMENTS,
    members: SAMPLE_MEMBERS,
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AssignMitigationForm>;

export const Default: Story = {};

export const NothingToAssign: Story = {
  args: { mitigations: SAMPLE_MITIGATIONS },
};

export const WithError: Story = {
  args: { error: "A mitigation can be assigned only to a member." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
