import type { Meta, StoryObj } from "@storybook/react-vite";

import { SAMPLE_HISTORY } from "@/test/safetyFile";
import AuditTrailTable from "./AuditTrailTable";

const meta: Meta<typeof AuditTrailTable> = {
  title: "Safety/Audit trail table",
  component: AuditTrailTable,
  parameters: { layout: "padded" },
  args: { history: SAMPLE_HISTORY, caption: "The ten most recent changes" },
};

export default meta;

type Story = StoryObj<typeof AuditTrailTable>;

/** A file's recent commits, each attributed to the person who made it. */
export const Default: Story = {};

/** Nothing recorded yet. */
export const Empty: Story = {
  args: { history: [] },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
