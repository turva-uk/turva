import type { Meta, StoryObj } from "@storybook/react-vite";
import PublicTitle from "./PublicTitle";

const meta = {
  title: "Public/Typography/Public title",
  component: PublicTitle,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: "var(--brand-primary)",
          minHeight: "100vh",
          padding: "var(--mantine-spacing-xl)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Communication that Counts!",
  },
};

export const WithAccent: Story = {
  args: {
    title: "Communication that *counts*!",
    c: "white",
  },
};

export const WithDescription: Story = {
  args: {
    title: "Communication that Counts!",
    description: "Clinical safety files that a whole team can keep up to date.",
  },
};

export const MediumSize: Story = {
  args: {
    title: "Our features",
    size: "md",
  },
};

export const SmallSize: Story = {
  args: {
    title: "Get started today",
    size: "sm",
  },
};

export const LeftAligned: Story = {
  args: {
    title: "Communication that Counts!",
    description: "Left-aligned variant for alternative layouts.",
    ta: "left",
  },
};
