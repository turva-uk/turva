import type { Meta, StoryObj } from "@storybook/react-vite";

import TurvaLogo from "./TurvaLogo";

const meta: Meta<typeof TurvaLogo> = {
  title: "Brand/TurvaLogo",
  component: TurvaLogo,
  parameters: { layout: "padded" },
  args: { size: 96 },
};

export default meta;

type Story = StoryObj<typeof TurvaLogo>;

/** The logo mark, an image called "Turva". */
export const Default: Story = {};

/** Smaller, as it might sit beside a heading. */
export const Small: Story = {
  args: { size: 48 },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
