/**
 * ConfirmModal Component Stories
 *
 * Demonstrates the ConfirmModal for destructive/irreversible actions:
 * - Default with all elements (icon + title + message)
 * - Title only (no icon)
 * - Icon only (no title)
 * - Loading state (accept in progress)
 * - Interactive demo with async handler
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { Stack } from "@mantine/core";
import ConfirmModal from "./ConfirmModal";
import { StoryNote } from "@/stories/variants";
import ButtonPair from "@/components/button/ButtonPair";

const meta: Meta<typeof ConfirmModal> = {
  title: "Confirm modal/Confirm modal",
  component: ConfirmModal,
  parameters: { layout: "padded" },
  args: {
    opened: true,
    onClose: fn(),
    onAccept: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

/** Default - modal with icon, title, and message */
export const Default: Story = {
  args: {
    title: "Delete mitigation",
    icon: <IconAlertTriangle />,
    acceptLabel: "Delete",
    submittingLabel: "Deleting…",
    children:
      "This will remove the mitigation from the hazard. The safety file keeps its history.",
  },
};

/** Title and message only (no icon) */
export const TitleOnly: Story = {
  args: {
    title: "Remove member",
    acceptLabel: "Remove",
    children: "Are you sure you want to remove this member? This action cannot be undone.",
  },
};

/** Icon and message only (no title) */
export const IconOnly: Story = {
  args: {
    "aria-label": "Discard unsaved changes",
    icon: <IconAlertTriangle />,
    acceptLabel: "Leave",
    cancelLabel: "Stay",
    children: "You have unsaved changes that will be lost.",
  },
  play: async () => {
    await expect(
      await within(document.body).findByRole("dialog", { name: "Discard unsaved changes" }),
    ).toBeVisible();
  },
};

/** A started action cannot be cancelled or accepted again. */
export const PendingDestructive: Story = {
  args: { ...Default.args, onAccept: () => new Promise<void>(() => {}) },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", { name: "Delete" }));
    await expect(body.getByRole("button", { name: "Deleting…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(body.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const PendingNonDestructive: Story = {
  args: {
    title: "Save changes",
    children: "The changes are being saved.",
    destructive: false,
    acceptLabel: "Save",
    onAccept: () => new Promise<void>(() => {}),
  },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", { name: "Save" }));
    await expect(body.getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(body.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

/** Interactive demo - press Close hazard to open, confirm to close */
export const Interactive: Story = {
  args: { opened: false },
  render: function InteractiveDemo() {
    const [opened, setOpened] = useState(false);

    const handleAccept = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    };

    return (
      <Stack>
        <StoryNote>Press Close hazard to see the confirmation modal.</StoryNote>
        <ButtonPair
          acceptLabel="Close hazard"
          onAccept={() => setOpened(true)}
          onCancel={() => {}}
        />
        <ConfirmModal
          opened={opened}
          onClose={() => setOpened(false)}
          onAccept={handleAccept}
          title="Close this hazard"
          acceptLabel="Close hazard"
          submittingLabel="Closing…"
          icon={<IconAlertTriangle />}
        >
          Closing TH-012 keeps its recorded scores in the hazard log. Confirm?
        </ConfirmModal>
      </Stack>
    );
  },
};

/** Dark mode variant */
export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
