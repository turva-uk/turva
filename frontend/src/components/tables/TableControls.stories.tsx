/**
 * Table Controls Stories
 *
 * Demonstrates DataTableControlled with integrated search, filter,
 * sorting, and pagination working together.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "@mantine/core";
import type { Column } from "./DataTable";
import {
  hazardFilterData,
  hazardFilterPredicate,
  hazardRows,
  type HazardRow,
} from "@/stories/hazardRows";
import DataTableControlled from "./DataTableControlled";

const columns: Column<HazardRow>[] = [
  { header: "Hazard", render: (h) => h.id, accessor: (h) => h.id },
  { header: "Title", render: (h) => h.title, accessor: (h) => h.title },
  { header: "Owner", render: (h) => h.owner, accessor: (h) => h.owner },
  { header: "Status", render: (h) => h.status, accessor: (h) => h.status },
  { header: "Risk", render: (h) => h.riskLabel, accessor: (h) => h.riskLabel },
];

const meta: Meta = {
  title: "Tables/Table controls",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const FullControls: Story = {
  render: () => (
    <Container size="lg" py="md">
      <DataTableControlled
        data={hazardRows}
        columns={columns}
        getRowKey={(h) => h.id}
        pageSize={10}
        filterData={hazardFilterData}
        filterLabel="Filter hazards"
        filterAriaLabel="Filter hazards"
        searchFields={(h) => [h.id, h.title, h.owner, h.status]}
        filterPredicate={hazardFilterPredicate}
      />
    </Container>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <Container size="lg" py="md">
      <DataTableControlled
        data={hazardRows}
        columns={columns}
        getRowKey={(h) => h.id}
        pageSize={10}
        filterData={hazardFilterData}
        filterLabel="Filter hazards"
        filterAriaLabel="Filter hazards"
        searchFields={(h) => [h.id, h.title, h.owner, h.status]}
        filterPredicate={hazardFilterPredicate}
      />
    </Container>
  ),
  globals: { colorScheme: "dark" },
};
