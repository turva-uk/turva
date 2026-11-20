/**
 * CodeConfirmModal Component Stories
 *
 * A confirmation that asks for the person's authenticator code first, as
 * signing a safety case does.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import CodeConfirmModal from "./CodeConfirmModal";

const meta: Meta<typeof CodeConfirmModal> = {
  title: "Confirm modal/Code confirm modal",
  component: CodeConfirmModal,
  parameters: { layout: "padded" },
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    title: "Approve the safety case",
    acceptLabel: "Approve",
    submittingLabel: "Approving…",
    children: "You are approving the file as it stands now, as its Clinical Safety Officer.",
  },
};

export default meta;
type Story = StoryObj<typeof CodeConfirmModal>;

/** Asking for the code before signing */
export const Default: Story = {};

/** A wrong code: the reason shows under the field, and it stays open */
export const WrongCode: Story = {
  args: {
    onConfirm: () => Promise.reject(new Error("That code was not accepted")),
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
