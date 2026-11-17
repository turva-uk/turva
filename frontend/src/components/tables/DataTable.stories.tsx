/**
 * DataTable Storybook Stories
 *
 * Demonstrates the DataTable component with different data types,
 * states, and column configurations.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Container } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { StoryNote } from "@/stories/variants";
import DataTable, { type Column } from "./DataTable";

interface User {
  id: number;
  username: string;
  email: string;
}

interface Hazard {
  id: string;
  title: string;
  owner: string;
  status: "open" | "closed" | "transferred";
  riskLabel: string;
}

const meta: Meta<typeof DataTable<User>> = {
  title: "Tables/Data table",
  component: DataTable,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Container size="lg">
        <Story />
      </Container>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataTable<User>>;

const sampleUsers: User[] = [
  { id: 1, username: "alice.smith", email: "alice@example.com" },
  { id: 2, username: "bob.jones", email: "bob@example.com" },
  { id: 3, username: "charlie.brown", email: "charlie@example.com" },
  { id: 4, username: "diana.prince", email: "diana@example.com" },
];

const userColumns: Column<User>[] = [
  {
    header: "Username",
    render: (user) => user.username,
  },
  {
    header: "Email",
    render: (user) => user.email,
  },
  {
    header: "User ID",
    render: (user) => String(user.id),
  },
];

/**
 * Default DataTable
 *
 * Shows the table with user data and basic columns.
 */
export const Default: Story = {
  args: {
    data: sampleUsers,
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};

/**
 * With hazard data
 *
 * Demonstrates the table with rows from a safety file's hazard log.
 */
export const WithHazardData: StoryObj<typeof DataTable<Hazard>> = {
  args: {
    data: [
      {
        id: "H-001",
        title: "Wrong patient record opened from the ward list",
        owner: "Clinical Safety Officer",
        status: "open",
        riskLabel: "Mandatory elimination",
      },
      {
        id: "H-002",
        title: "Allergy not shown on the prescribing screen",
        owner: "Deployment lead",
        status: "open",
        riskLabel: "Undesirable",
      },
      {
        id: "H-003",
        title: "Discharge summary sent to the wrong practice",
        owner: "Clinical Safety Officer",
        status: "closed",
        riskLabel: "Acceptable",
      },
    ],
    columns: [
      { header: "Hazard", render: (hazard) => hazard.id },
      { header: "Title", render: (hazard) => hazard.title },
      { header: "Owner", render: (hazard) => hazard.owner },
      { header: "Status", render: (hazard) => hazard.status },
      { header: "Risk", render: (hazard) => hazard.riskLabel },
    ],
    onRowClick: fn(),
    getRowKey: (hazard) => hazard.id,
  },
};

/**
 * Many Rows
 *
 * Shows the table with more data to demonstrate scrolling behavior.
 */
export const ManyRows: Story = {
  args: {
    data: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
    })),
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};

/**
 * Long Text
 *
 * Tests how the table handles cells with very long text content.
 */
// cspell:disable
export const LongText: Story = {
  args: {
    data: [
      {
        id: 1,
        username: "superlongusernamethatjustkeepsgoingandgoingwithoutanybreaks",
        email:
          "a.very.long.email.address.that.goes.on.and.on@extremely-long-domain-name-example.co.uk",
      },
      {
        id: 2,
        username: "normaluser",
        email: "normal@example.com",
      },
      {
        id: 3,
        username: "Dr. Bartholomew Featherstonehaugh-Worthington III",
        email:
          "bartholomew.featherstonehaugh-worthington@prestigious-medical-institution.nhs.uk",
      },
    ],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
  },
};
// cspell:enable

/**
 * Narrow header in a card
 *
 * A table in a BaseCard inherits the card's "break anywhere" wrapping. A
 * header in a column narrower than its words wraps between them and
 * never inside one: the column grows to fit its longest word.
 */
export const NarrowHeaderInACard: Story = {
  args: {
    data: sampleUsers,
    columns: [
      {
        header: "Username",
        render: (user) => user.username,
        accessor: (user) => user.username,
      },
      {
        header: "Email",
        render: (user) => user.email,
        accessor: (user) => user.email,
      },
      {
        header: "Authorised here",
        width: "140px",
        render: (user) => String(user.id),
        accessor: (user) => user.id,
      },
    ],
    getRowKey: (user) => user.id,
  },
  render: (args) => (
    <BaseCard>
      <DataTable {...args} />
    </BaseCard>
  ),
};

interface MitigationRow {
  id: string;
  title: string;
  hazard: string;
  controlType: string;
  owner: string;
  updated: string;
  status: "proposed" | "implemented" | "verified" | "withdrawn";
}

const mitigations: MitigationRow[] = [
  {
    id: "M-001",
    title: "Show the patient banner on every screen",
    hazard: "H-001",
    controlType: "technical",
    owner: "Deployment lead",
    updated: "2026-09-28",
    status: "implemented",
  },
  {
    id: "M-002",
    title: "Train ward staff to check two identifiers",
    hazard: "H-001",
    controlType: "procedural",
    owner: "Clinical Safety Officer",
    updated: "2026-09-30",
    status: "proposed",
  },
  {
    id: "M-003",
    title: "Block prescribing until allergies are recorded",
    hazard: "H-002",
    controlType: "elimination",
    owner: "Deployment lead",
    updated: "2026-10-01",
    status: "verified",
  },
];

const sevenColumns: Column<MitigationRow>[] = [
  { header: "Mitigation", render: (m) => m.title, accessor: (m) => m.title },
  { header: "ID", render: (m) => m.id },
  { header: "Hazard", render: (m) => m.hazard, accessor: (m) => m.hazard },
  { header: "Control type", render: (m) => m.controlType },
  { header: "Owner", render: (m) => m.owner },
  { header: "Updated", render: (m) => m.updated, accessor: (m) => m.updated },
  { header: "Status", render: (m) => m.status },
];

const threeColumns: Column<MitigationRow>[] = sevenColumns.filter((c) =>
  ["Mitigation", "Hazard", "Status"].includes(c.header),
);

/**
 * Seven columns in a 40rem space. Seven columns need 56rem at the
 * default 8rem each, so the table draws cards. Widen the Storybook
 * canvas and nothing changes: the container, not the screen, is what is
 * measured.
 */
export const SevenColumnsInANarrowSpace: StoryObj<typeof DataTable<MitigationRow>> = {
  render: () => (
    <div>
      <Container size={40 * 16} px={0}>
        <DataTable
          data={mitigations}
          columns={sevenColumns}
          onRowClick={fn()}
          getRowKey={(m) => m.id}
        />
      </Container>
      <StoryNote mt="xs">
        Container constrained to 40rem: seven columns do not fit, so cards
      </StoryNote>
    </div>
  ),
};

/**
 * Three columns in the same 40rem space. Three columns need 24rem, which
 * fits, so this stays a table where the one above became cards.
 */
export const ThreeColumnsInANarrowSpace: StoryObj<typeof DataTable<MitigationRow>> = {
  render: () => (
    <div>
      <Container size={40 * 16} px={0}>
        <DataTable
          data={mitigations}
          columns={threeColumns}
          onRowClick={fn()}
          getRowKey={(m) => m.id}
        />
      </Container>
      <StoryNote mt="xs">The same 40rem: three columns fit, so still a table</StoryNote>
    </div>
  ),
};

/**
 * Seven columns at the full width of the page container. Drag the
 * Storybook canvas narrower than about 56rem and it switches to cards;
 * widen it past 58rem and it comes back, the 2rem margin stopping it
 * flickering at the edge.
 */
export const SevenColumnsAtFullWidth: StoryObj<typeof DataTable<MitigationRow>> = {
  render: () => (
    <div>
      <DataTable
        data={mitigations}
        columns={sevenColumns}
        onRowClick={fn()}
        getRowKey={(m) => m.id}
      />
      <StoryNote mt="xs">
        Shrink the canvas below about 56rem to see the switch to cards
      </StoryNote>
    </div>
  ),
};

/**
 * Error State
 *
 * Shows an error alert when data fails to load.
 */
export const Error: Story = {
  args: {
    data: [],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
    error: "Failed to load users from the server",
  },
};

/**
 * Loading State
 *
 * Shows skeleton loaders while data is being fetched.
 */
export const Loading: Story = {
  args: {
    data: [],
    columns: userColumns,
    onRowClick: fn(),
    getRowKey: (user) => user.id,
    loading: true,
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

export const DarkModeLoading: Story = {
  ...Loading,
  globals: { colorScheme: "dark" },
};
