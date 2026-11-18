/**
 * BodyText Storybook Stories
 *
 * Demonstrates the BodyText component - standard body copy styling.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import BodyText from "./BodyText";

const meta = {
  title: "Foundations/Typography/Body text",
  component: BodyText,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof BodyText>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleText =
  "A delayed discharge summary could leave a GP without the medication changes made in hospital.";

/** Default body text */
export const Default: Story = {
  args: {
    children: sampleText,
  },
};

/** Text typed into a text area, with the lines it was written in. */
export const PreservedLines: Story = {
  args: {
    children: "We will look into this for you.\nUpdate 05/10/26: fixed in the next release.",
    preserveLines: true,
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
