/**
 * Not yet in Turva's API: the file's prose documents.
 *
 * DocumentTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
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
