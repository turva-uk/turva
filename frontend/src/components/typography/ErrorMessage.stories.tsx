import type { Meta, StoryObj } from "@storybook/react-vite";
import ErrorMessage from "./ErrorMessage";

const meta: Meta<typeof ErrorMessage> = {
  title: "Foundations/Typography/Error message",
  component: ErrorMessage,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {
  args: {
    children: "Please choose a severity",
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
