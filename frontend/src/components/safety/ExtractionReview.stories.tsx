/**
 * Not yet in Turva's API: supplier extraction.
 *
 * ExtractionReview Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import ExtractionReview from "./ExtractionReview";
import { SAMPLE_EXTRACTION, samplePreview } from "@/test/safetyFile";

const meta: Meta<typeof ExtractionReview> = {
  decorators: [aheadOfTheApi("supplier extraction")],
  title: "Safety/Extraction review",
  component: ExtractionReview,
  parameters: { layout: "padded" },
  args: {
    extraction: SAMPLE_EXTRACTION,
    previewAssessment: samplePreview,
    rejected: new Set<number>(),
    onToggleRow: () => {},
    onColumnMapChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ExtractionReview>;

export const Default: Story = {};

export const NoteRowLeftOut: Story = {
  args: { rejected: new Set([2]) },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
