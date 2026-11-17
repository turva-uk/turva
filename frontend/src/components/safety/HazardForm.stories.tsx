/**
 * HazardForm Storybook Stories
 *
 * Every story passes `samplePreview` as `previewAssessment`, so none
 * reaches the network: the levels shown are the ones Turva's matrix
 * gives, from the sample data.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { blankHazard, hazardInputFrom, type Assessment } from "@/lib/safety";
import { MITIGATED_HAZARD, SAMPLE_HAZARD_OPTIONS, samplePreview } from "@/test/safetyFile";

import HazardForm from "./HazardForm";

const meta: Meta<typeof HazardForm> = {
  title: "Safety/Hazard form",
  component: HazardForm,
  parameters: { layout: "padded" },
  args: {
    options: SAMPLE_HAZARD_OPTIONS,
    previewAssessment: samplePreview,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HazardForm>;

export const NewHazard: Story = {
  args: { initial: blankHazard("cso@riverbank.example.nhs.uk") },
};

export const Editing: Story = {
  args: { initial: hazardInputFrom(MITIGATED_HAZARD) },
};

export const SaveFailed: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    error: "Somebody else saved this file after you opened it.",
  },
};

/** The server could not be asked for the level. */
export const PreviewFailed: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    previewAssessment: () => Promise.reject(new Error("offline")),
  },
};

export const Saving: Story = {
  args: { initial: blankHazard("cso@riverbank.example.nhs.uk"), saving: true },
};

/** Waiting for the server's answer: no level is shown until it comes. */
export const WorkingOutTheLevel: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    previewAssessment: () => new Promise<Assessment>(() => {}),
  },
};

export const DarkMode: Story = {
  ...Editing,
  globals: { colorScheme: "dark" },
};
