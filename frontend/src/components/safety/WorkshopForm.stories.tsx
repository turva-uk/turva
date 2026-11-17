/**
 * Not yet in Turva's API: hazard workshops.
 *
 * WorkshopForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
import WorkshopForm from "./WorkshopForm";
import { SAMPLE_HAZARDS } from "@/test/safetyFile";

const meta: Meta<typeof WorkshopForm> = {
  decorators: [aheadOfTheApi("hazard workshops")],
  title: "Safety/Workshop form",
  component: WorkshopForm,
  parameters: { layout: "padded" },
  args: {
    hazards: SAMPLE_HAZARDS,
    today: "2026-11-07",
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WorkshopForm>;

export const Default: Story = {};

export const Saving: Story = { args: { saving: true } };

export const WithError: Story = {
  args: { error: "Somebody else saved this file after you opened it." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
