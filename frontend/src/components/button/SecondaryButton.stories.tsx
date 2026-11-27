import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import { expect, fn, within } from "storybook/test";

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

/**
 * One of several on a list, such as each pending invitation's "Revoke". It
 * shows the short word, and a screen reader hears the fuller name, which
 * says which row it acts on.
 */
export const OnARow: Story = {
  args: { children: "Revoke", "aria-label": "Revoke invitation to a.patel@example.org" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Revoke invitation to a.patel@example.org",
    });

    await expect(button).toHaveTextContent(/^Revoke$/);
  },
};

/** Under way, such as while a PDF is prepared. */
export const Loading: Story = {
  args: { children: "Download draft safety file (PDF)", loading: true },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
