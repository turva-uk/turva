/**
 * SafetyCaseTable Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { Stack } from "@mantine/core";
import SafetyCaseTable from "./SafetyCaseTable";
import { SAMPLE_FILES } from "@/test/safetyFile";

const meta: Meta<typeof SafetyCaseTable> = {
  title: "Safety/Safety case table",
  component: SafetyCaseTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SafetyCaseTable>;

export const Default: Story = {
  args: { cases: SAMPLE_FILES, onSelect: fn() },
};

export const Empty: Story = {
  args: { cases: [], onSelect: fn() },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

/** The 720px reflow viewport leaves 688px inside Storybook's padding. */
export const NarrowRecordActions: Story = {
  ...Default,
  render: (args) => (
    <Stack maw={688}>
      <SafetyCaseTable {...args} />
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "BP@Home remote blood pressure monitoring" }),
    ).toBeVisible();
    await expect(canvas.getByText("1 Mar 2026")).toHaveAttribute(
      "datetime",
      "2026-03-01T09:00:00Z",
    );
    await expect(canvas.queryByText(/Invalid date/i)).toBeNull();
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.ownerDocument.defaultView!.innerWidth,
    );
  },
};
