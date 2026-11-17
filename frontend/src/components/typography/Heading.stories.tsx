/**
 * Heading Storybook Stories
 *
 * Demonstrates the Heading component - bold, prominent text
 * for card titles and section headings.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Heading from "./Heading";

const meta = {
  title: "Foundations/Typography/Heading",
  component: Heading,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default header text */
export const Default: Story = {
  args: {
    children: "Hazard details",
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
