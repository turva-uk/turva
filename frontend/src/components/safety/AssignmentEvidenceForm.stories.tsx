/**
 * Not yet in Turva's API: mitigation assignments.
 *
 * AssignmentEvidenceForm Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, userEvent, within } from "storybook/test";
import AssignmentEvidenceForm from "./AssignmentEvidenceForm";
import { SAMPLE_HEAD, SAMPLE_MY_ASSIGNMENT } from "@/test/safetyFile";

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

export const NativeSubmission: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText("Evidence"),
      "Fictional implementation claim.\nSecond line retained.",
    );
    (canvas.getByRole("form") as HTMLFormElement).requestSubmit();
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenLastCalledWith(
      "proposed",
      "Fictional implementation claim.\nSecond line retained.",
      SAMPLE_HEAD,
    );
  },
};

export const VerifiedRecordIsReadOnly: Story = {
  args: {
    assignment: {
      ...SAMPLE_MY_ASSIGNMENT,
      mitigation: {
        ...SAMPLE_MY_ASSIGNMENT.mitigation,
        status: "verified",
        evidence:
          "A fictional recorded verification claim.\nThe delegate cannot change this judgement.",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const evidence = canvas.getByLabelText("Evidence");
    await expect(evidence).toHaveAttribute("readonly");
    await expect(evidence).not.toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Status" })).toHaveValue("verified");
    await userEvent.click(canvas.getByRole("button", { name: "Save evidence" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Saving: Story = {
  args: { saving: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Evidence")).toHaveAttribute("readonly");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

export const WithError: Story = {
  args: { error: "Somebody else saved this file after you opened it." },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
