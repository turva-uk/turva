import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryNote, VariantRow, VariantStack } from "@/stories/variants";

import BrandSpinner from "./BrandSpinner";

const meta: Meta<typeof BrandSpinner> = {
  title: "Feedback/Brand spinner",
  component: BrandSpinner,
  parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof BrandSpinner>;

/** The belt, at its usual size, for a wait inside a page already showing. */
export const Default: Story = {};

export const AllSizes: Story = {
  name: "All sizes",
  render: () => (
    <VariantStack>
      <VariantRow label="2rem">
        <BrandSpinner size="2rem" />
      </VariantRow>
      <VariantRow label="4rem (default)">
        <BrandSpinner />
      </VariantRow>
      <VariantRow label="8rem, as PageSpinner draws it">
        <BrandSpinner size="8rem" />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
  render: () => (
    <>
      <BrandSpinner />
      <StoryNote>Somebody who asks for less motion sees the still first frame.</StoryNote>
    </>
  ),
};
