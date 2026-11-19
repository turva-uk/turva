/**
 * PasswordConfirmModal Component Stories
 *
 * A confirmation that asks for the person's password first, as turning
 * two-factor authentication off does.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { IconAlertTriangle } from "@/components/icons/appIcons";
import PasswordConfirmModal from "./PasswordConfirmModal";

const meta: Meta<typeof PasswordConfirmModal> = {
  title: "Confirm modal/Password confirm modal",
  component: PasswordConfirmModal,
  parameters: { layout: "padded" },
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    title: "Turn off two-factor authentication",
    acceptLabel: "Turn off",
    submittingLabel: "Turning off…",
    children: "Signing in will ask for your password only. Enter your password to turn it off.",
  },
};

export default meta;
type Story = StoryObj<typeof PasswordConfirmModal>;

/** Asking for the password before turning two-factor off */
export const Default: Story = {
  args: { icon: <IconAlertTriangle /> },
};

/** A wrong password: the reason shows under the field, and it stays open */
export const WrongPassword: Story = {
  args: {
    icon: <IconAlertTriangle />,
    onConfirm: () => Promise.reject(new Error("Incorrect password")),
  },
};

/** Without an icon, for a change that is not a warning */
export const NotDestructive: Story = {
  args: {
    title: "Confirm it is you",
    acceptLabel: "Continue",
    destructive: false,
    children: "Enter your password to continue.",
  },
};
