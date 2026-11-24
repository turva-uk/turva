/**
 * Not yet in Turva's API: the template's process steps.
 *
 * ProcessStepTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, within } from "storybook/test";
import ProcessStepTable from "./ProcessStepTable";
import { SAMPLE_PROCESS } from "@/test/safetyFile";

const meta: Meta<typeof ProcessStepTable> = {
  decorators: [aheadOfTheApi("the template's process steps")],
  title: "Safety/Process step table",
  component: ProcessStepTable,
  parameters: { layout: "padded" },
  args: { steps: SAMPLE_PROCESS.steps, onSelect: fn() },
};

export default meta;
type Story = StoryObj<typeof ProcessStepTable>;

export const Default: Story = {};

export const NoProcess: Story = { args: { steps: [] } };

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};

export const InconsistentCompletion: Story = {
  args: {
    steps: [
      {
        ...SAMPLE_PROCESS.steps[0]!,
        done: true,
        reasons: ["A recorded requirement is still outstanding."],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("A process step is marked done but still has outstanding requirements."),
    ).toBeVisible();
    await expect(canvas.queryByText("Done")).toBeNull();
    // No row is shown, so none can be opened.
    await expect(canvas.queryByText(SAMPLE_PROCESS.steps[0]!.title)).toBeNull();
  },
};
