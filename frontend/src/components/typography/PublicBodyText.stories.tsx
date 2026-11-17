import type { Meta, StoryObj } from "@storybook/react-vite";
import PublicBodyText from "./PublicBodyText";
import { VariantRow, VariantStack } from "@/stories/variants";
import { BRAND_BACKDROP } from "@/stories/backdrops";

const meta = {
  title: "Public/Typography/Public body text",
  component: PublicBodyText,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          ...BRAND_BACKDROP,
          minHeight: "100vh",
          padding: "var(--mantine-spacing-xl)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicBodyText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Clinical safety files that a whole team can keep up to date.",
  },
};

export const AllAlignments: Story = {
  args: { children: "" },
  render: () => (
    <VariantStack>
      <VariantRow label="left (default)" horizontal={false}>
        <PublicBodyText>Left-aligned body text for public pages.</PublicBodyText>
      </VariantRow>
      <VariantRow label="centre" horizontal={false}>
        <PublicBodyText justify="centre">
          Centre-aligned body text for public pages.
        </PublicBodyText>
      </VariantRow>
      <VariantRow label="right" horizontal={false}>
        <PublicBodyText justify="right">
          Right-aligned body text for public pages.
        </PublicBodyText>
      </VariantRow>
    </VariantStack>
  ),
};
