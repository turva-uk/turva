/**
 * ExtraButton Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ExtraButton from "./ExtraButton";
import { IconUserPlus } from "@/components/icons/appIcons";

const meta: Meta<typeof ExtraButton> = {
  title: "Button/Extra button",
  component: ExtraButton,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ExtraButton>;

export const Default: Story = {
  args: { "aria-label": "Add hazard", onClick: fn() },
};

export const AddingAPerson: Story = {
  args: { "aria-label": "Add user", icon: <IconUserPlus />, onClick: fn() },
};

export const Disabled: Story = {
  args: { "aria-label": "Add hazard", disabled: true },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
