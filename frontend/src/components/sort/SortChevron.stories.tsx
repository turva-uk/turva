/**
 * SortChevron Stories
 *
 * Demonstrates the directional chevron indicator in all states.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { VariantStack, VariantRow } from "@/stories/variants";
import SortChevron from "./SortChevron";

const meta: Meta<typeof SortChevron> = {
  title: "Sort/Sort chevron",
  component: SortChevron,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SortChevron>;

export const Default: Story = {
  args: { direction: "neutral" },
};

export const AllStates: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Neutral (unsorted)">
        <SortChevron direction="neutral" />
      </VariantRow>
      <VariantRow label="Up (ascending)">
        <SortChevron direction="up" />
      </VariantRow>
      <VariantRow label="Down (descending)">
        <SortChevron direction="down" />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Neutral (unsorted)">
        <SortChevron direction="neutral" />
      </VariantRow>
      <VariantRow label="Up (ascending)">
        <SortChevron direction="up" />
      </VariantRow>
      <VariantRow label="Down (descending)">
        <SortChevron direction="down" />
      </VariantRow>
    </VariantStack>
  ),
  globals: { colorScheme: "dark" },
};
