/**
 * DataTableControlled Stories
 *
 * Demonstrates the controlled table component with integrated
 * search, filter, and pagination.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Container } from "@mantine/core";
import AddButton from "@/components/button/AddButton";
import { StoryNote } from "@/stories/variants";
import DataTableControlled from "./DataTableControlled";
import type { Column } from "./DataTable";
import {
  hazardFilterData,
  hazardFilterPredicate,
  hazardRows,
  type HazardRow,
} from "@/stories/hazardRows";

const columns: Column<HazardRow>[] = [
  { header: "Hazard", render: (h) => h.id, accessor: (h) => h.id },
  { header: "Title", render: (h) => h.title, accessor: (h) => h.title },
  { header: "Owner", render: (h) => h.owner, accessor: (h) => h.owner },
  { header: "Status", render: (h) => h.status, accessor: (h) => h.status },
  { header: "Risk", render: (h) => h.riskLabel, accessor: (h) => h.riskLabel },
];

const meta: Meta<typeof DataTableControlled> = {
  title: "Tables/DataTable controlled",
  component: DataTableControlled,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/**
 * Full controls with search, filter, sorting, and pagination.
 */
export const Default: Story = {
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

/**
 * Search only - no filter dropdown.
 */
export const SearchOnly: Story = {
  render: () => (
    <Container size="lg" py="md">
      <DataTableControlled
        data={hazardRows}
        columns={columns}
        getRowKey={(h) => h.id}
        pageSize={10}
        searchFields={(h) => [h.id, h.title, h.owner, h.status]}
        filterPredicate={() => () => true}
      />
    </Container>
  ),
};

/**
 * The table's own action, in the same row as search and filter.
 */
export const WithAction: Story = {
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
        action={<AddButton label="Add hazard" />}
      />
    </Container>
  ),
};

/**
 * Too narrow for the action, search and filter on one line: the row
 * wraps, and every line stays right-aligned.
 */
export const WithActionNarrow: Story = {
  render: () => (
    <Container size="lg" py="md">
      <Box maw={320}>
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
          action={<AddButton label="Add hazard" />}
        />
      </Box>
      <StoryNote>
        Constrained to 320px, as on a phone. Open the search to see the row wrap.
      </StoryNote>
    </Container>
  ),
};

/**
 * Dark mode variant.
 */
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
