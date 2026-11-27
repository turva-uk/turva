/**
 * PDFDownload Storybook Stories
 *
 * Every story passes a stand-in for the download, so none reaches the
 * network or saves a file.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { ApiError } from "@/api/client";
import { SAMPLE_HEAD } from "@/test/safetyFile";

import PDFDownload from "./PDFDownload";

const meta: Meta<typeof PDFDownload> = {
  title: "Safety/PDF download",
  component: PDFDownload,
  parameters: { layout: "padded" },
  args: {
    slug: "demo",
    head: SAMPLE_HEAD,
    download: () => new Promise<Blob>(() => undefined),
  },
};

export default meta;
type Story = StoryObj<typeof PDFDownload>;

export const Default: Story = {};

/** The file changed after the page opened, so the server refused to build it. */
export const StaleVersion: Story = {
  args: {
    download: () =>
      Promise.reject(
        new ApiError(409, "This safety file changed after you opened it. Reload it first."),
      ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Download draft safety file (PDF)" }),
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "changed after you opened",
    );
  },
};

/** Preparing: the stand-in never answers, so the button stays busy. */
export const Preparing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Download draft safety file (PDF)" }),
    );
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
