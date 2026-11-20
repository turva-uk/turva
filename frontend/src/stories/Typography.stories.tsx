/**
 * Foundations/Typography
 *
 * Turva's type: the font, the fixed type scale and the headings. Sizes come
 * from `typographyTokens` in `theme.ts`, and do not change with screen width.
 * The headings and type scale show raw Mantine `Title` and `Text` on purpose:
 * they are the sizes the typography components are built on.
 */

import { Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading } from "@/components/typography";
import { StoryNote, VariantRow, VariantStack } from "@/stories/variants";
import { DISPLAY_FONT, typographyTokens } from "@/theme";

const meta: Meta = {
  title: "Foundations/Typography",
};

export default meta;

type Story = StoryObj;

const HEADINGS = [1, 2, 3, 4, 5, 6] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export const Overview: Story = {
  render: () => (
    <Stack gap="xl">
      <Stack gap="xs">
        <Heading>Font family</Heading>
        <StoryNote>
          <strong>Atkinson Hyperlegible Next</strong>, designed by the Braille Institute for
          readability. Self-hosted variable font.
        </StoryNote>
        <StoryNote>
          Its characters are hard to confuse, which matters when a reader is checking a hazard
          reference or a risk score: Il1O0 Qq9g rn m.
        </StoryNote>
      </Stack>

      <Stack gap="xs">
        <Heading>Display font</Heading>
        <Text ff={DISPLAY_FONT} fz={40} lh={1.2}>
          Cormorant Garamond
        </Text>
        <StoryNote>For the few large public titles that ask for it by name.</StoryNote>
      </Stack>
    </Stack>
  ),
};

export const Headings: Story = {
  render: () => (
    <VariantStack>
      {HEADINGS.map((order) => (
        <VariantRow
          key={order}
          label={`h${order}: ${typographyTokens.headings[`h${order}`].fontSize}`}
          horizontal={false}
        >
          <Title order={order}>Hazard log for the discharge summary</Title>
        </VariantRow>
      ))}
    </VariantStack>
  ),
};

export const TypeScale: Story = {
  name: "Type scale",
  render: () => (
    <VariantStack>
      {SIZES.map((size) => (
        <VariantRow
          key={size}
          label={`${size}: ${typographyTokens.fontSizes[size]}${size === "md" ? " (body)" : ""}`}
          horizontal={false}
        >
          <Text size={size}>A hazard is a potential source of harm.</Text>
        </VariantRow>
      ))}
    </VariantStack>
  ),
};
