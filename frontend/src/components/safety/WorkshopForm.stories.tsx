/**
 * Not yet in Turva's API: hazard workshops.
 *
 * WorkshopForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, userEvent, within } from "storybook/test";
import WorkshopForm from "./WorkshopForm";
import { SAMPLE_HAZARDS } from "@/test/safetyFile";

const meta: Meta<typeof WorkshopForm> = {
  decorators: [aheadOfTheApi("workshop recording (outside funded phase-one scope)")],
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

export const MissingAttendees: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Record workshop" }));
    const attendees = canvas.getByLabelText(/Attendees/);
    await expect(attendees).toHaveAttribute("aria-invalid", "true");
    await expect(attendees).toHaveAccessibleDescription(/Name at least one/);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Attendees/)).toHaveAttribute("readonly");
    await expect(canvas.getByRole("combobox", { name: "Hazards it raised" })).toHaveAttribute(
      "aria-readonly",
      "true",
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Saving: Story = { args: { saving: true } };

export const WithError: Story = {
  args: { error: "Somebody else saved this file after you opened it." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
