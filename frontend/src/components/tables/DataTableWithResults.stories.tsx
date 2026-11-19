/**
 * DataTableWithResults Stories
 *
 * Demonstrates the table with optional full-width sub-rows
 * for showing operation results and detail messages.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BodyTextInline } from "@/components/typography";
import { statusColours } from "@/styles/semanticColours";
import DataTableWithResults, { type ResultColumn } from "./DataTableWithResults";

interface DemoRow {
  id: string;
  name: string;
  type: string;
  version: number;
  items: number;
  outcome: "pass" | "fail";
  reason: string;
}

const columns: ResultColumn<DemoRow>[] = [
  { header: "Module", width: "30%", render: (r) => r.name },
  { header: "Type", width: "15%", render: (r) => r.type },
  { header: "Version", width: "10%", render: (r) => r.version },
  { header: "Items", width: "10%", render: (r) => r.items },
  {
    header: "Status",
    width: "35%",
    render: (r) =>
      r.outcome === "pass" ? (
        <BodyTextInline c={statusColours.success.fg}>Pass</BodyTextInline>
      ) : (
        <BodyTextInline c={statusColours.alert.fg}>Fail</BodyTextInline>
      ),
  },
];

const allPass: DemoRow[] = [
  {
    id: "a",
    name: "Module A",
    type: "uniform",
    version: 2,
    items: 48,
    outcome: "pass",
    reason: "",
  },
  {
    id: "b",
    name: "Module B",
    type: "variable",
    version: 1,
    items: 32,
    outcome: "pass",
    reason: "",
  },
  {
    id: "c",
    name: "Module C",
    type: "uniform",
    version: 4,
    items: 60,
    outcome: "pass",
    reason: "",
  },
];

const withFailures: DemoRow[] = [
  {
    id: "a",
    name: "Module A",
    type: "uniform",
    version: 2,
    items: 48,
    outcome: "pass",
    reason: "",
  },
  {
    id: "b",
    name: "Module B",
    type: "variable",
    version: 2,
    items: 32,
    outcome: "fail",
    reason: "Version 2 is not greater than stored version 2",
  },
  {
    id: "c",
    name: "Module C",
    type: "uniform",
    version: 3,
    items: 60,
    outcome: "fail",
    reason:
      "Failed to download from GCS: connection timeout after 30s. The remote storage bucket 'bailey-medics-teaching-prod' did not respond within the configured timeout window. This may indicate a network connectivity issue between the application server and Google Cloud Storage, or the bucket may be temporarily unavailable due to a regional outage. Please verify that the service account has the correct IAM permissions (roles/storage.objectViewer) and that the bucket exists in the expected region (europe-west2).",
  },
  {
    id: "d",
    name: "Module D",
    type: "variable",
    version: 1,
    items: 24,
    outcome: "pass",
    reason: "",
  },
];

const getSubRow = (row: DemoRow) =>
  row.reason ? <BodyTextInline c={statusColours.alert.fg}>{row.reason}</BodyTextInline> : null;

const meta: Meta<typeof DataTableWithResults> = {
  title: "Tables/Data table with results",
  component: DataTableWithResults,
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof DataTableWithResults<DemoRow>>;

export const AllPassing: Story = {
  render: () => (
    <DataTableWithResults
      data={allPass}
      columns={columns}
      getRowKey={(r) => r.id}
      getSubRow={getSubRow}
      emptyMessage="No modules"
    />
  ),
};

export const WithFailures: Story = {
  render: () => (
    <DataTableWithResults
      data={withFailures}
      columns={columns}
      getRowKey={(r) => r.id}
      getSubRow={getSubRow}
      emptyMessage="No modules"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTableWithResults
      data={[] as DemoRow[]}
      columns={columns}
      getRowKey={(r) => r.id}
      emptyMessage="No results to display"
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <DataTableWithResults
      data={[] as DemoRow[]}
      columns={columns}
      getRowKey={(r) => r.id}
      loading
    />
  ),
};

export const DarkMode: Story = {
  render: () => (
    <DataTableWithResults
      data={withFailures}
      columns={columns}
      getRowKey={(r) => r.id}
      getSubRow={getSubRow}
    />
  ),
  globals: { colorScheme: "dark" },
};
