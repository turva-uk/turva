/**
 * SortHeader Stories
 *
 * Demonstrates the sortable column header button in all three states:
 * unsorted, ascending, and descending.
 */

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { VariantStack, VariantRow } from "@/stories/variants";
import SortHeader, { type SortDirection } from "./SortHeader";

const meta: Meta<typeof SortHeader> = {
  title: "Tables/Sort header",
  component: SortHeader,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SortHeader>;
function InteractiveSortHeader() {
  const [direction, setDirection] = useState<SortDirection | null>(null);

  const handleClick = () => {
    if (direction === null) setDirection("asc");
    else if (direction === "asc") setDirection("desc");
    else setDirection(null);
  };

  return (
    <Stack gap="md">
      <SortHeader label="Name" direction={direction} onClick={handleClick} />
    </Stack>
  );
}

export const Default: Story = {
  render: () => <InteractiveSortHeader />,
};
export const AllStates: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Unsorted">
        <SortHeader label="Name" direction={null} onClick={() => {}} />
      </VariantRow>
      <VariantRow label="Ascending">
        <SortHeader label="Name" direction="asc" onClick={() => {}} />
      </VariantRow>
      <VariantRow label="Descending">
        <SortHeader label="Name" direction="desc" onClick={() => {}} />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Unsorted">
        <SortHeader label="Name" direction={null} onClick={() => {}} />
      </VariantRow>
      <VariantRow label="Ascending">
        <SortHeader label="Name" direction="asc" onClick={() => {}} />
      </VariantRow>
      <VariantRow label="Descending">
        <SortHeader label="Name" direction="desc" onClick={() => {}} />
      </VariantRow>
    </VariantStack>
  ),
  globals: { colorScheme: "dark" },
};
