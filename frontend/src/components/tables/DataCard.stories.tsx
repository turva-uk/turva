/**
 * DataCard Storybook Stories
 *
 * Demonstrates the DataCard component with different data types
 * and column configurations.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { Container } from "@mantine/core";
import DataCard, { DataCardSkeleton } from "./DataCard";
import EllipsisMenu from "@/components/ellipsis-menu/EllipsisMenu";
import type { Column } from "./DataTable";

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

const meta: Meta<typeof DataCard<User>> = {
  title: "Tables/Data card",
  component: DataCard,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Container size="sm" ml={0}>
        <Story />
      </Container>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataCard<User>>;

const userColumns: Column<User>[] = [
  { header: "Username", render: (user) => user.username },
  { header: "Email", render: (user) => user.email },
  { header: "User ID", render: (user) => String(user.id) },
];

/**
 * Default DataCard
 *
 * Shows a single card with user data.
 */
export const Default: Story = {
  args: {
    row: { id: 1, username: "alice.smith", email: "alice@example.com" },
    columns: userColumns,
    onClick: fn(),
  },
};

/**
 * With hazard data
 *
 * Demonstrates the card with a row from a safety file's hazard log.
 */
export const WithHazardData: StoryObj<typeof DataCard<Hazard>> = {
  args: {
    row: {
      id: "H-001",
      title: "Wrong patient record opened from the ward list",
      owner: "Clinical Safety Officer",
      status: "open",
      riskLabel: "Mandatory elimination",
    },
    columns: [
      { header: "Hazard", render: (hazard) => hazard.id },
      { header: "Title", render: (hazard) => hazard.title },
      { header: "Owner", render: (hazard) => hazard.owner },
      { header: "Status", render: (hazard) => hazard.status },
      { header: "Risk", render: (hazard) => hazard.riskLabel },
    ],
    onClick: fn(),
  },
};

/**
 * Long text
 *
 * Shows how the card handles very long content in a cell.
 */
export const LongText: Story = {
  args: {
    row: {
      id: 1,
      username: "alice.smith",
      email:
        "alice.very-long-email-address-that-goes-on-and-on-and-on-and-keeps-going@extremely-long-domain-name-example.co.uk",
    },
    columns: [
      { header: "Username", render: (user) => user.username },
      { header: "Email", render: (user) => user.email },
      {
        header: "Notes",
        render: () =>
          "This is a very long piece of text that might appear in a cell. It keeps going and going to test how the card layout handles overflow and wrapping behaviour when the content is much longer than expected.",
      },
      {
        header: "Reference",
        render: () =>
          "Pneumonoultramicroscopicsilicovolcanoconiosis-with-additional-hyphenated-words-that-make-it-even-longer",
      },
    ],
    onClick: fn(),
  },
};

/**
 * Loading
 *
 * Shows skeleton placeholders while data is being fetched.
 */
/** A footer beneath the fields: how `DataTableWithResults` shows a
 * row's result detail on a phone. */
export const WithFooter: Story = {
  args: {
    ...Default.args,
    footer: "Version mismatch: the module was built for an older schema.",
  },
};

/**
 * A last column with an empty header, as tables give their row menu,
 * drawn as the card's action at its top right with no label.
 */
export const WithRowAction: Story = {
  args: {
    row: { id: 1, username: "alice.smith", email: "alice@example.com" },
    columns: [
      ...userColumns,
      {
        header: "",
        render: () => (
          <EllipsisMenu
            aria-label="Actions for alice.smith"
            items={[{ label: "Remove", onClick: fn() }]}
          />
        ),
      },
    ],
    onClick: fn(),
  },
};

export const NarrowLongLabels: Story = {
  args: {
    row: { id: 1, username: "Dr Alex Patel, fictional CSO", email: "alex.patel@example.test" },
    columns: [
      {
        header: "Accountable Clinical Safety Officer for this deployment",
        render: (user) => user.username,
      },
      {
        header: "Evidence location",
        render: () =>
          "https://evidence.example.test/a-long-reference-to-the-reviewed-source-document",
      },
      {
        header: "",
        render: () => (
          <EllipsisMenu
            aria-label="Record actions"
            items={[{ label: "Review", onClick: fn() }]}
          />
        ),
      },
    ],
    onClick: fn(),
  },
  render: (args) => (
    <div data-testid="narrow-record" style={{ width: 320, maxWidth: "100%" }}>
      <DataCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument.fonts.ready;
    const record = within(canvasElement).getByTestId("narrow-record");
    await expect(record.scrollWidth).toBeLessThanOrEqual(record.clientWidth);
  },
};

export const Loading: Story = {
  args: {
    row: { id: 0, username: "", email: "" },
    columns: userColumns,
    onClick: fn(),
    loading: true,
  },
};

/** The skeleton alone, as the tables show it while their rows load. */
export const Skeleton: Story = {
  render: () => <DataCardSkeleton />,
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

export const DarkModeLoading: Story = {
  ...Loading,
  globals: { colorScheme: "dark" },
};
