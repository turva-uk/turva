/**
 * SafetyDocumentSheet Storybook Stories
 *
 * The status is not yet in Turva's API, so only the stories that show one
 * carry that note. The document page leaves it out, as `AsThePageShowsIt`
 * does.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { expect, within } from "storybook/test";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { SAMPLE_DOCUMENT, SAMPLE_HEAD } from "@/test/safetyFile";

import DocumentNodes from "./DocumentNodes";
import SafetyDocumentSheet from "./SafetyDocumentSheet";

const withStatus = aheadOfTheApi("the file's status");

const meta: Meta<typeof SafetyDocumentSheet> = {
  title: "Safety/Safety document sheet",
  component: SafetyDocumentSheet,
  parameters: { layout: "padded" },
  args: {
    system: "BP@Home remote blood pressure monitoring",
    commit: SAMPLE_HEAD,
    children: <DocumentNodes document={SAMPLE_DOCUMENT} slug="demo" />,
  },
};

export default meta;
type Story = StoryObj<typeof SafetyDocumentSheet>;

/** No status: `SafetyFile` has none yet, so the document page shows none. */
export const AsThePageShowsIt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(`As at commit ${SAMPLE_HEAD}`)).toBeVisible();
    await expect(canvas.queryByText(/not approved/)).toBeNull();
  },
};

export const Draft: Story = {
  decorators: [withStatus],
  args: { status: "draft" },
};

export const Accepted: Story = {
  decorators: [withStatus],
  args: { status: "accepted" },
};

export const NarrowDocument: Story = {
  render: (args) => (
    <Box maw={358}>
      <SafetyDocumentSheet {...args} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByTestId("safety-document-sheet");
    const region = canvas.getByRole("region", { name: "Table, scrolls horizontally" });
    await expect(region.getBoundingClientRect().right).toBeLessThanOrEqual(
      sheet.getBoundingClientRect().right,
    );
    await expect(
      canvas.getByRole("link", { name: /a\.patel@riverbank\.example\.nhs\.uk/ }),
    ).toHaveAttribute("href", "mailto:a.patel@riverbank.example.nhs.uk");
  },
};

export const MissingSourceVersion: Story = {
  args: { commit: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("alert", { name: "Source version unavailable" }),
    ).toBeVisible();
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
