import type { Meta, StoryObj } from "@storybook/react-vite";

import PageSpinner from "./PageSpinner";

const meta: Meta<typeof PageSpinner> = {
  title: "Feedback/Page spinner",
  component: PageSpinner,
  parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof PageSpinner>;

/** The belt in the middle of the page, at the one size a page wait uses. */
export const Default: Story = {};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
