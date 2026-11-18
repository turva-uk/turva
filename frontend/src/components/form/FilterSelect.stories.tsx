/**
 * FilterSelect Component Stories
 *
 * Demonstrates the filter icon button with a popover multi-select
 * dropdown.
 */

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import FilterSelect from "./FilterSelect";
import { userEvent, within } from "storybook/test";

const meta: Meta<typeof FilterSelect> = {
  title: "Tables/Filter select",
  component: FilterSelect,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FilterSelect>;

const trustData = [
  {
    group: "Trust",
    items: [
      { value: "trust:leeds", label: "Leeds Teaching Hospitals" },
      { value: "trust:bradford", label: "Bradford Teaching Hospitals" },
      { value: "trust:airedale", label: "Airedale NHS Foundation Trust" },
    ],
  },
  {
    group: "Clinical lead",
    items: [
      { value: "lead:morton", label: "Prof James Morton" },
      { value: "lead:singh", label: "Dr Rachel Singh" },
    ],
  },
  {
    group: "Other",
    items: [{ value: "first-pass-only", label: "1st time passers only" }],
  },
];

function InteractiveFilterSelect({ preselected = [] }: { preselected?: string[] }) {
  const [value, setValue] = useState<string[]>(preselected);

  return (
    <Group justify="flex-end">
      <FilterSelect
        data={trustData}
        value={value}
        onChange={setValue}
        label="Filter delegates"
        placeholder={"Select filters\u2026"}
        aria-label="Filter delegates"
      />
    </Group>
  );
}

export const Default: Story = {
  render: () => <InteractiveFilterSelect />,
};

export const WithActiveFilters: Story = {
  render: () => <InteractiveFilterSelect preselected={["trust:leeds", "lead:morton"]} />,
};

/** Exercise nested options, not only the closed trigger. */
export const OpenFilters: Story = {
  ...WithActiveFilters,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Filter delegates" }),
    );
    const dropdown = within(canvasElement.ownerDocument.body);
    (await dropdown.findByRole("combobox", { name: "Filter delegates" })).focus();
    await userEvent.keyboard("{ArrowDown}");
    await dropdown.findByRole("option", { name: "Bradford Teaching Hospitals" });
  },
};

/** Shows the count indicator at each value from 0 through 9+ */
export const CountIndicator: Story = {
  render: () => {
    const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return (
      <Group gap="lg">
        {counts.map((n) => (
          <FilterSelect
            key={n}
            data={trustData}
            value={Array.from({ length: n }, (_, i) => `item-${i}`)}
            onChange={() => {}}
            aria-label={`Filter (${n})`}
          />
        ))}
      </Group>
    );
  },
};

export const DarkMode: Story = {
  render: () => (
    <Group gap="lg">
      <InteractiveFilterSelect />
      <InteractiveFilterSelect preselected={["trust:leeds", "lead:morton"]} />
    </Group>
  ),
  globals: { colorScheme: "dark" },
};
