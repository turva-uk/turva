/**
 * DocumentNodes Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { SAMPLE_DOCUMENT } from "@/test/safetyFile";

import DocumentNodes from "./DocumentNodes";

const meta: Meta<typeof DocumentNodes> = {
  title: "Safety/Document nodes",
  component: DocumentNodes,
  parameters: { layout: "padded" },
  args: { document: SAMPLE_DOCUMENT, slug: "demo" },
};

export default meta;
type Story = StoryObj<typeof DocumentNodes>;

/** Headings, a table, an admonition, links, a reference and an image left out. */
export const Document: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("note")).toHaveTextContent("Not shown");
    await expect(canvasElement.querySelector("img")).toBeNull();
  },
};

/** A collapsible admonition, and one marked as danger. */
export const Admonitions: Story = {
  args: {
    document: {
      ...SAMPLE_DOCUMENT,
      unsupported: 0,
      blocks: [
        {
          type: "admonition",
          kind: "danger",
          title: "Residual risk requires elimination: HAZ-002",
          collapsible: false,
          children: [
            {
              type: "element",
              tag: "p",
              children: [{ type: "text", text: "Do not go live." }],
            },
          ],
        },
        {
          type: "admonition",
          kind: "note",
          title: "How this was assessed",
          collapsible: true,
          open: true,
          children: [
            {
              type: "element",
              tag: "p",
              children: [{ type: "text", text: "At the pathway walkthrough." }],
            },
          ],
        },
      ],
    },
  },
};

/** The server refused a formatted view, so the committed source shows as text. */
export const RefusedFormatting: Story = {
  args: {
    document: {
      ...SAMPLE_DOCUMENT,
      available: false,
      reason: "unsupported-formatting",
      message: "This document uses formatting Turva cannot show safely.",
      source: "# Clinical safety case report\n\n<iframe src=x></iframe>\n\nRecorded text.",
      blocks: [],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("iframe")).toBeNull();
  },
};

export const Empty: Story = {
  args: { document: { ...SAMPLE_DOCUMENT, blocks: [], unsupported: 0 } },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
