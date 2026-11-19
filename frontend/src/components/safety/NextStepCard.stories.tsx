/**
 * Not yet in Turva's API: the template's process steps.
 *
 * NextStepCard Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, within } from "storybook/test";
import NextStepCard from "./NextStepCard";
import { SAMPLE_PROCESS } from "@/test/safetyFile";

const meta: Meta<typeof NextStepCard> = {
  decorators: [aheadOfTheApi("the template's process steps")],
  title: "Safety/Next step card",
  component: NextStepCard,
  parameters: { layout: "padded" },
  args: { process: SAMPLE_PROCESS, onOpenGuide: fn() },
};

export default meta;
type Story = StoryObj<typeof NextStepCard>;

export const PartWayThrough: Story = {};

export const Complete: Story = {
  args: {
    process: {
      next_step: null,
      steps: SAMPLE_PROCESS.steps.map((step) => ({
        ...step,
        done: true,
        reasons: [],
      })),
    },
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};

export const MissingNextStep: Story = {
  args: { process: { ...SAMPLE_PROCESS, next_step: null } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Process status unavailable");
    await expect(canvas.queryByText("Every step of the process is complete")).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
    await expect(args.onOpenGuide).not.toHaveBeenCalled();
  },
};
