/**
 * ButtonPairRed Storybook Stories
 *
 * Demonstrates the ButtonPairRed component for destructive accept/cancel actions.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ButtonPairRed from "./ButtonPairRed";

const meta: Meta<typeof ButtonPairRed> = {
  title: "Button/Button pair red",
  component: ButtonPairRed,
  parameters: {
    layout: "padded",
  },
  args: {
    onAccept: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ButtonPairRed>;

/** Default red button pair */
export const Default: Story = {};

/** Accept button disabled */
export const AcceptDisabled: Story = {
  args: {
    acceptDisabled: true,
  },
};

/** Accept button in submitting state */
export const Submitting: Story = {
  args: {
    acceptLabel: "Deactivate",
    submittingLabel: "Submitting…",
    acceptLoading: true,
    acceptDisabled: true,
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
