/**
 * BaseCard Component Stories
 *
 * Demonstrates the standard card wrapper with fixed styling.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group, Stack } from "@mantine/core";
import { BodyText, BodyTextBold, BodyTextInline, Heading } from "@/components/typography";
import { VariantRow, VariantStack } from "@/stories/variants";
import BaseCard from "./BaseCard";

const meta: Meta<typeof BaseCard> = {
  title: "Cards/Base card",
  component: BaseCard,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof BaseCard>;

/** Default card with fixed styling */
export const Default: Story = {
  render: () => (
    <BaseCard>
      <Stack gap="sm">
        <Heading>Base card</Heading>
        <BodyText>
          Standard shadow, radius, border, and lg padding applied automatically.
        </BodyText>
      </Stack>
    </BaseCard>
  ),
};

/** Coloured card - border removed, white text */
export const WithBackground: Story = {
  render: () => (
    <BaseCard bg="var(--success-color)">
      <Stack gap="sm">
        <Heading c="white">Coloured card</Heading>
        <BodyText c="white">
          Pass a bg prop and the border disappears. Text is set to white automatically.
        </BodyText>
      </Stack>
    </BaseCard>
  ),
};

/** Style callbacks and arrays keep Mantine's precedence and theme access. */
export const StyleOverrides: Story = {
  render: () => (
    <BaseCard
      style={[
        { overflow: "hidden" },
        [undefined, (theme) => ({ borderColor: theme.colors["primary"]?.[6] })],
      ]}
    >
      <Heading>Style array and theme callback</Heading>
      <BodyText>The card still renders, with the caller's themed border.</BodyText>
    </BaseCard>
  ),
};

const LONG_ADDRESS =
  "/teaching/assessments/12345/questions/67890/review/8ed08fd0c2b48463456cb1a88add2739f5fcd5a7";

function LongWordCard({ wrapLongWords }: { wrapLongWords?: boolean }) {
  return (
    <BaseCard w={280} wrapLongWords={wrapLongWords}>
      <Stack gap="sm">
        <Heading>Sent from</Heading>
        <BodyText>{LONG_ADDRESS}</BodyText>
        <Group gap="xs">
          <BodyTextBold>Page:</BodyTextBold>
          <BodyTextInline>{LONG_ADDRESS}</BodyTextInline>
        </Group>
      </Stack>
    </BaseCard>
  );
}

/**
 * A word longer than the card, such as an address or a release id,
 * breaks inside itself. With `wrapLongWords` off it runs out of the side.
 */
export const LongWord: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="default" horizontal={false}>
        <LongWordCard />
      </VariantRow>
      <VariantRow label="wrapLongWords={false}" horizontal={false}>
        <LongWordCard wrapLongWords={false} />
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

export const DarkModeColoured: Story = {
  ...WithBackground,
  globals: { colorScheme: "dark" },
};
