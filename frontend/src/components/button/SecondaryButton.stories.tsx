import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import { fn } from "storybook/test";

import SecondaryButton from "./SecondaryButton";

const meta: Meta<typeof SecondaryButton> = {
  title: "Buttons/Secondary button",
  component: SecondaryButton,
  parameters: { layout: "padded" },
  args: { onClick: fn(), children: "I have confirmed my email - check again" },
  decorators: [
    (Story) => (
      <Group justify="flex-end">
        <Story />
      </Group>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SecondaryButton>;

/** The less important action, as on the email confirmation page. */
export const Default: Story = {};

/** Unavailable for now, such as while a save is under way. */
export const Disabled: Story = {
  args: { children: "Cancel", disabled: true },
};

/** Under way, such as while a PDF is prepared. */
export const Loading: Story = {
  args: { children: "Download draft safety file (PDF)", loading: true },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
