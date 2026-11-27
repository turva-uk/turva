/**
 * Not yet in Turva's API: the file's prose documents.
 *
 * DocumentTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, within } from "storybook/test";
import DocumentTable from "./DocumentTable";
import { SAMPLE_DOCUMENTS } from "@/test/safetyFile";

const meta: Meta<typeof DocumentTable> = {
  decorators: [aheadOfTheApi("the file's prose documents")],
  title: "Safety/Document table",
  component: DocumentTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DocumentTable>;

export const Default: Story = {
  args: { documents: SAMPLE_DOCUMENTS, onSelect: fn() },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

export const Unavailable: Story = {
  args: {
    documents: SAMPLE_DOCUMENTS,
    onSelect: fn(),
    error: "Recorded documents could not be read.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Recorded documents could not be read.")).toBeVisible();
    await expect(canvas.queryByText("No documents in this safety file")).toBeNull();
    // No row is shown, so none can be opened.
    await expect(canvas.queryByText(SAMPLE_DOCUMENTS[0]!.title)).toBeNull();
  },
};
