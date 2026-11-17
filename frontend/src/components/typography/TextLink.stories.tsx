import type { Meta, StoryObj } from "@storybook/react-vite";
import TextLink from "./TextLink";

const meta: Meta<typeof TextLink> = {
  title: "Foundations/Typography/Text link",
  component: TextLink,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TextLink>;

export const Default: Story = {
  args: {
    to: "/register",
    children: "Don't have an account? Register",
  },
};

export const ShortLink: Story = {
  args: {
    to: "/about",
    children: "Learn more",
  },
};

/** On its own line: at least 44px tall below 640px, for a finger. */
export const Standalone: Story = {
  args: {
    to: "/forgot-password",
    children: "Forgot password?",
    standalone: true,
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
