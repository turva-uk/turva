/**
 * RiskScoreBadge Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import RiskScoreBadge from "./RiskScoreBadge";
import { VariantRow, VariantStack } from "@/stories/variants";
import { assessment } from "@/test/safetyFile";

const meta: Meta<typeof RiskScoreBadge> = {
  title: "Safety/Risk score badge",
  component: RiskScoreBadge,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RiskScoreBadge>;

export const Default: Story = {
  args: { assessment: assessment(4, 3) },
};

export const AllLevels: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="1 and 2: acceptable">
        <RiskScoreBadge assessment={assessment(1, 1)} />
        <RiskScoreBadge assessment={assessment(4, 1)} />
      </VariantRow>
      <VariantRow label="3: undesirable">
        <RiskScoreBadge assessment={assessment(3, 3)} />
      </VariantRow>
      <VariantRow label="4 and 5: reduce before go-live">
        <RiskScoreBadge assessment={assessment(4, 3)} />
        <RiskScoreBadge assessment={assessment(5, 5)} />
      </VariantRow>
    </VariantStack>
  ),
};

/** The number alone, as the hazard log shows it; hover for the words. */
export const Compact: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Compact: 1, 3 and 5">
        <RiskScoreBadge assessment={assessment(1, 1)} compact />
        <RiskScoreBadge assessment={assessment(3, 3)} compact />
        <RiskScoreBadge assessment={assessment(5, 5)} compact />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...AllLevels,
  globals: { colorScheme: "dark" },
};

export const CompactDarkMode: Story = {
  ...Compact,
  globals: { colorScheme: "dark" },
};
