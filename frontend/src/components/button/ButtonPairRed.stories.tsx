/**
 * ButtonPairRed Storybook Stories
 *
 * Demonstrates the ButtonPairRed component for destructive accept/cancel actions.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
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
  },
  play: async ({ canvasElement, args }) => {
    const accept = within(canvasElement).getByRole("button", { name: "Submitting…" });
    await expect(accept).toHaveAttribute("aria-disabled", "true");
    await expect(accept).toHaveAttribute("aria-busy", "true");
    await userEvent.click(accept);
    accept.focus();
    await userEvent.keyboard("{Enter} ");
    await expect(args.onAccept).not.toHaveBeenCalled();
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
