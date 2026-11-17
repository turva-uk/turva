import type { Meta, StoryObj } from "@storybook/react-vite";
import FieldDescription from "./FieldDescription";

const meta: Meta<typeof FieldDescription> = {
  title: "Foundations/Typography/Field description",
  component: FieldDescription,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FieldDescription>;

export const Default: Story = {
  args: {
    children: "Choose how you would like to be contacted",
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
  args: {
    children: "Choose how you would like to be contacted",
  },
};
