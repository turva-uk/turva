import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { SAMPLE_HISTORY } from "@/test/safetyFile";
import AuditTrailTable from "./AuditTrailTable";

const meta: Meta<typeof AuditTrailTable> = {
  title: "Safety/Audit trail table",
  component: AuditTrailTable,
  parameters: { layout: "padded" },
  args: { history: SAMPLE_HISTORY, label: "Change history" },
};

export default meta;

type Story = StoryObj<typeof AuditTrailTable>;

/** A file's recent commits, each attributed to the person who made it. */
export const Default: Story = {};

/**
 * Changes by two people: the bar offers search, a filter by who made each
 * change and sortable headings. It is a record, so it has no add button.
 */
export const SeveralPeople: Story = {
  args: {
    history: [
      ...SAMPLE_HISTORY,
      {
        short_sha: "bbbbbbbb",
        subject: "Record HAZ-001",
        author_name: "Dr Anita Patel",
        author_email: "a.patel@riverbank.example.nhs.uk",
        committed_at: "2026-02-18T09:00:00Z",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Filter changes by who made them" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Sort by When" })).toBeVisible();
  },
};

/** Nothing recorded yet. */
export const Empty: Story = {
  args: { history: [] },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
