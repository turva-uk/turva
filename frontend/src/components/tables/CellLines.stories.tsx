/**
 * CellLines Storybook Stories
 *
 * Shown in a hazard log: a hazard with one, two or three mitigations,
 * with each mitigation's owner in the same entry. Independently wrapped
 * columns cannot preserve title/owner pairing by visual line position.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import DataTable, { type Column } from "./DataTable";
import CellLines from "./CellLines";
import { StoryNote } from "@/stories/variants";

const meta: Meta<typeof CellLines> = {
  title: "Tables/Cell lines",
  component: CellLines,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CellLines>;

interface Control {
  title: string;
  owner: string | null;
}

interface HazardControls {
  id: string;
  title: string;
  mitigations: Control[];
}

const BANNER: Control = {
  title: "Show the patient banner on every screen",
  owner: "Deployment lead",
};
const TRAINING: Control = {
  title: "Train ward staff to check two identifiers",
  owner: "Clinical Safety Officer",
};
const AUDIT: Control = { title: "Audit record matches each month", owner: null };

const hazards: HazardControls[] = [
  { id: "H-001", title: "Wrong patient record opened", mitigations: [BANNER] },
  { id: "H-002", title: "Allergy not shown", mitigations: [BANNER, TRAINING] },
  {
    id: "H-003",
    title: "Result filed unreviewed",
    mitigations: [BANNER, TRAINING, AUDIT],
  },
  { id: "H-004", title: "Duplicate record created", mitigations: [] },
];

const columns: Column<HazardControls>[] = [
  { header: "Hazard", render: (h) => h.title },
  {
    header: "Mitigation and owner",
    render: (h) => (
      <CellLines
        lines={h.mitigations.map((m) => `${m.title}. Owner: ${m.owner ?? "Not recorded"}.`)}
      />
    ),
  },
];

function HazardsTable() {
  return (
    <Stack gap="sm">
      <DataTable data={hazards} columns={columns} getRowKey={(h) => h.id} />
      <StoryNote>
        One, two and three mitigations, then none. Each owner stays in the same entry as its
        mitigation, even when text wraps. Missing ownership is stated explicitly.
      </StoryNote>
    </Stack>
  );
}

/** Hazards with one, two and three mitigations, and with none. */
export const MitigationsAndOwners: Story = {
  render: () => <HazardsTable />,
};

/** The component on its own: one line, three lines, and none. */
export const OnItsOwn: Story = {
  render: () => (
    <Stack gap="md">
      <CellLines lines={["Show the patient banner on every screen"]} />
      <StoryNote>One line</StoryNote>
      <CellLines
        lines={[
          "Show the patient banner on every screen",
          "Train ward staff to check two identifiers",
          "Audit record matches each month",
        ]}
      />
      <StoryNote>Three lines</StoryNote>
      <CellLines lines={[]} />
      <StoryNote>None, shown as a dash</StoryNote>
    </Stack>
  ),
};

export const DarkMode: Story = {
  render: () => <HazardsTable />,
  globals: { colorScheme: "dark" },
};
