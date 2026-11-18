import type { Meta, StoryObj } from "@storybook/react-vite";
import EmptyState from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Foundations/Typography/Empty state",
  component: EmptyState,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    children: "Type a message...",
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
