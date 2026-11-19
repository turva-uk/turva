/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignMitigationForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, userEvent, within } from "storybook/test";
import AssignMitigationForm from "./AssignMitigationForm";
import {
  SAMPLE_ASSIGNMENTS,
  SAMPLE_MEMBERS,
  SAMPLE_MITIGATIONS,
  FLAGGING_MITIGATION,
  SAMPLE_IT_LEAD,
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

export const NativeSubmission: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("combobox", { name: "Mitigation" }));
    await userEvent.click(
      await body.findByRole("option", { name: "MIT-002: Daily safety-netting report" }),
    );
    await userEvent.click(canvas.getByRole("combobox", { name: "Who" }));
    await userEvent.click(await body.findByRole("option", { name: "Sam Rivers" }));
    (canvas.getByRole("form") as HTMLFormElement).requestSubmit();
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenLastCalledWith("MIT-002", SAMPLE_IT_LEAD.id);
    await expect(
      canvas.getByRole("combobox", { name: "Mitigation" }),
    ).toHaveAccessibleDescription("Selected: MIT-002: Daily safety-netting report");
    await expect(
      canvas.getByText("Selected: MIT-002: Daily safety-netting report"),
    ).toBeVisible();
  },
};

export const UnsupportedStatus: Story = {
  args: { mitigations: [{ ...FLAGGING_MITIGATION, status: "unknown-status" }] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent(
      "unsupported recorded status",
    );
  },
};

export const Saving: Story = { args: { saving: true } };

export const NothingToAssign: Story = {
  args: { mitigations: SAMPLE_MITIGATIONS },
};

export const WithError: Story = {
  args: { error: "A mitigation can be assigned only to a member." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
