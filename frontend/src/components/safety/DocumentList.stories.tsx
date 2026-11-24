/**
 * DocumentList Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { SAMPLE_DOCUMENT_LIST } from "@/test/safetyFile";

import DocumentList from "./DocumentList";

const meta: Meta<typeof DocumentList> = {
  title: "Safety/Document list",
  component: DocumentList,
  parameters: { layout: "padded" },
  args: {
    documents: SAMPLE_DOCUMENT_LIST,
    current: "safety-case",
    href: (key: string) => `/safety-files/demo/documents/${key}/`,
  },
};

export default meta;
type Story = StoryObj<typeof DocumentList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Clinical safety case report" }),
    ).toHaveAttribute("aria-current", "page");
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
