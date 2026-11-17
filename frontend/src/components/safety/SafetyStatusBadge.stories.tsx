/**
 * Not yet in Turva's API: a file's status, which comes from sign-off.
 *
 * SafetyStatusBadge Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import SafetyStatusBadge from "./SafetyStatusBadge";
import { VariantRow, VariantStack } from "@/stories/variants";

const meta: Meta<typeof SafetyStatusBadge> = {
  decorators: [aheadOfTheApi("a file's status, which comes from sign-off")],
  title: "Safety/Safety status badge",
  component: SafetyStatusBadge,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SafetyStatusBadge>;

export const Draft: Story = { args: { status: "draft" } };

export const AllStatuses: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="draft">
        <SafetyStatusBadge status="draft" />
      </VariantRow>
      <VariantRow label="approved">
        <SafetyStatusBadge status="approved" />
      </VariantRow>
      <VariantRow label="accepted">
        <SafetyStatusBadge status="accepted" />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...AllStatuses,
  globals: { colorScheme: "dark" },
};
