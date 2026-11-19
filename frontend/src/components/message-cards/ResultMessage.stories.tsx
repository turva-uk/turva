/**
 * ResultMessage Component Stories
 *
 * Demonstrates result alert banners mirroring the StateMessage pattern:
 * - Success: green with check icon
 * - Error: red with X icon
 * - Warning: yellow with alert triangle icon
 * - With and without subtitle
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import ResultMessage from "./ResultMessage";

const meta: Meta<typeof ResultMessage> = {
  title: "Teaching/Result message",
  // Hidden from the sidebar locally and on the published Storybook:
  // passport and teaching are not part of Turva. Still run by `just sbt`.
  tags: ["!dev"],
  component: ResultMessage,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof ResultMessage>;

/**
 * Success
 *
 * Green alert with check icon for positive outcomes.
 */
export const Success: Story = {
  args: {
    variant: "success",
    title: "Passed",
    subtitle: "Optical diagnosis of diminutive colorectal polyps",
  },
};

/**
 * Fail
 *
 * Red alert with X icon for negative outcomes.
 */
export const Fail: Story = {
  args: {
    variant: "fail",
    title: "Not passed",
    subtitle: "Optical diagnosis of diminutive colorectal polyps",
  },
};

/**
 * Warning
 *
 * Yellow alert with triangle icon for incomplete or cautionary outcomes.
 */
export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Incomplete",
    subtitle: "Optical diagnosis of diminutive colorectal polyps",
  },
};

export const DarkMode: Story = {
  ...Success,
  globals: { colorScheme: "dark" },
};
