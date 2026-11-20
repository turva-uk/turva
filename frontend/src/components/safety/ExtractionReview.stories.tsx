/**
 * Not yet in Turva's API: supplier extraction.
 *
 * ExtractionReview Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

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
    onToggleRow: fn(),
    onColumnMapChange: fn(),
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

export const CompleteComparison: Story = {
  args: {
    extraction: {
      ...SAMPLE_EXTRACTION,
      rows: [
        {
          ...SAMPLE_EXTRACTION.rows[0]!,
          effect:
            "A fictional escalation is delayed.\nThe full pathway effect remains visible.",
          harm: "A fictional harm statement retained for comparison.",
          controls: "A fictional supplier control and its stated limitation.",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/full pathway effect remains visible/)).toBeVisible();
    await expect(
      canvas.getByText("A fictional harm statement retained for comparison."),
    ).toBeVisible();
    await expect(
      canvas.getByText("A fictional supplier control and its stated limitation."),
    ).toBeVisible();
    await expect(canvas.getByText("Severity: 4; likelihood: 1.")).toBeVisible();
  },
};

export const UnsupportedScore: Story = {
  args: {
    extraction: {
      ...SAMPLE_EXTRACTION,
      rows: [{ ...SAMPLE_EXTRACTION.rows[0]!, severity: 6, problems: [] }],
    },
    previewAssessment: fn(samplePreview),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "scores are missing or unsupported",
    );
    await expect(canvas.getByText("Severity: 6; likelihood: 1.")).toBeVisible();
    await expect(args.previewAssessment).not.toHaveBeenCalled();
  },
};

export const UnsupportedMapping: Story = {
  args: {
    extraction: {
      ...SAMPLE_EXTRACTION,
      column_map: { ...SAMPLE_EXTRACTION.column_map, cause: 99 },
    },
  },
  play: async ({ canvasElement, args }) => {
    const field = within(canvasElement).getByRole("combobox", { name: "Cause" });
    await expect(field).toHaveValue("Unsupported column: 99");
    await expect(args.onColumnMapChange).not.toHaveBeenCalled();
    await userEvent.click(field);
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("option", { name: "None" }),
    );
    await expect(args.onColumnMapChange).toHaveBeenCalledTimes(1);
    await expect(args.onColumnMapChange).toHaveBeenLastCalledWith({
      ...SAMPLE_EXTRACTION.column_map,
      cause: null,
    });
  },
};

export const NoRowsSupplied: Story = {
  args: { extraction: { ...SAMPLE_EXTRACTION, rows: [] } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent(
      "does not establish that the source contains no hazards",
    );
  },
};

export const MismatchedPreview: Story = {
  args: {
    extraction: { ...SAMPLE_EXTRACTION, rows: [SAMPLE_EXTRACTION.rows[0]!] },
    previewAssessment: () => samplePreview(1, 1),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "could not work out the risk level",
    );
    await expect(canvas.queryByRole("img", { name: /^Risk level/ })).toBeNull();
  },
};
