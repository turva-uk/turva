import type { Meta, StoryObj } from "@storybook/react-vite";
import BodyTextClamp from "./BodyTextClamp";

const meta: Meta<typeof BodyTextClamp> = {
  title: "Foundations/Typography/Body text clamp",
  component: BodyTextClamp,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof BodyTextClamp>;

const LONG_TEXT =
  "Thank you for the letter, I've received it and will review with my GP. " +
  "I also wanted to mention that I've been experiencing some new symptoms " +
  "since my last appointment and would appreciate a follow-up call when " +
  "you have a chance. Kind regards.";

export const Default: Story = {
  args: {
    lineClamp: 2,
    children: LONG_TEXT,
  },
};

export const SingleLine: Story = {
  args: {
    lineClamp: 1,
    children: LONG_TEXT,
  },
};

export const ThreeLines: Story = {
  args: {
    lineClamp: 3,
    children: LONG_TEXT,
  },
};

export const ShortText: Story = {
  args: {
    lineClamp: 2,
    children: "Short message that fits on one line.",
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
