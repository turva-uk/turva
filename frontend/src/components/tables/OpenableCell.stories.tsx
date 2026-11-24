/**
 * OpenableCell Stories
 *
 * A table cell's content, as the keyboard way into its row. Text becomes
 * a button that looks like plain text; anything else is left as it is.
 * Press Tab to see its focus ring round the text.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { VariantRow, VariantStack } from "@/stories/variants";
import { ActiveStatusBadge } from "@/components/badge";
import OpenableCell from "./OpenableCell";

const meta: Meta<typeof OpenableCell> = {
  title: "Tables/Openable cell",
  component: OpenableCell,
  parameters: { layout: "padded" },
  args: {
    content: "Jane Smith",
    onOpen: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OpenableCell>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Text, with onOpen: a button">
        <OpenableCell content="Jane Smith" onOpen={fn()} />
      </VariantRow>
      <VariantRow label="Text, without onOpen: plain text">
        <OpenableCell content="Jane Smith" />
      </VariantRow>
      <VariantRow label="Not text, such as a badge: left as it is">
        <OpenableCell content={<ActiveStatusBadge active />} onOpen={fn()} />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
