/**
 * PreviousNextButton Storybook Stories
 *
 * Demonstrates the PreviousNextButton component for step-by-step navigation.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { fn } from "storybook/test";
import PreviousNextButton from "./PreviousNextButton";
import { StoryNote } from "@/stories/variants";

const meta: Meta<typeof PreviousNextButton> = {
  title: "Teaching/Previous next button",
  // Hidden from the sidebar locally and on the published Storybook:
  // passport and teaching are not part of Turva. Still run by `just sbt`.
  tags: ["!dev"],
  component: PreviousNextButton,
  parameters: {
    layout: "padded",
  },
  args: {
    onPrevious: fn(),
    onNext: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PreviousNextButton>;

/** Default with both buttons */
export const Default: Story = {};

/** First step - no Previous button */
export const FirstStep: Story = {
  args: {
    onPrevious: undefined,
  },
};

/** Last step with custom label */
export const LastStep: Story = {
  args: {
    nextLabel: "Submit & finish",
  },
};

/** Forward button disabled */
export const NextDisabled: Story = {
  args: {
    nextDisabled: true,
  },
};

/** Forward button loading */
export const NextLoading: Story = {
  args: {
    nextLoading: true,
  },
};

/** Finish button shown when reviewing results on the last question (disabled mode) */
export const ReviewFinish: Story = {
  render: (args) => (
    <Stack gap="md">
      <StoryNote>
        Shown on the last question when a user is reviewing their answers after the exam has
        been submitted. The "Finish" label replaces "Submit & finish".
      </StoryNote>
      <PreviousNextButton {...args} />
    </Stack>
  ),
  args: {
    nextLabel: "Finish",
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
