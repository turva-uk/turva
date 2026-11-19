/**
 * FilterModal Component Stories
 *
 * Demonstrates the filter dropdown panel matching the popover
 * appearance in FilterSelect.
 */

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import FilterModal from "./FilterModal";

const meta: Meta<typeof FilterModal> = {
  title: "Tables/Filter modal",
  component: FilterModal,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FilterModal>;

const groupedData = [
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

function InteractiveModal({ preselected = [] }: { preselected?: string[] }) {
  const [value, setValue] = useState<string[]>(preselected);
  return (
    <FilterModal
      data={groupedData}
      value={value}
      onChange={setValue}
      label="Filter delegates"
      placeholder={"Select items\u2026"}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveModal />,
};

export const WithActiveFilters: Story = {
  render: () => <InteractiveModal preselected={["trust:leeds", "lead:morton"]} />,
};

export const DarkMode: Story = {
  render: () => <InteractiveModal preselected={["trust:bradford"]} />,
  globals: { colorScheme: "dark" },
};
