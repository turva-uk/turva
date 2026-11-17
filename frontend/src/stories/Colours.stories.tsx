/**
 * Foundations/Colours
 *
 * The colours the shared components draw from: Turva's two brand scales,
 * the status colours and the text colours. Switch the toolbar's colour
 * scheme to see the ones that change in dark mode.
 */

import { Box, Group, Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryNote } from "@/stories/variants";
import {
  statusColours,
  statusTextColour,
  textColours,
  type StatusColourName,
} from "@/styles/semanticColours";
import { TURVA_PURPLE, TURVA_YELLOW } from "@/theme";

const meta: Meta = {
  title: "Foundations/Colours",
};

export default meta;

type Story = StoryObj;

/**
 * One shade of a scale, with its index and hex beneath it. The label sits
 * below the colour, not on it: shade 5 of the purple is under 4.5:1 with
 * both black and white text.
 */
function Swatch({ colour, label }: { colour: string; label: string }) {
  return (
    <Stack gap={4} w={88}>
      <Box h={48} style={{ background: colour }} />
      <Text size="xs">{label}</Text>
    </Stack>
  );
}

/** A ten-shade scale. */
function Scale({ name, shades }: { name: string; shades: readonly string[] }) {
  return (
    <Stack gap="xs">
      <Title order={3}>{name}</Title>
      <Group gap={4} align="flex-start">
        {shades.map((shade, index) => (
          <Swatch key={shade} colour={shade} label={`${index} ${shade}`} />
        ))}
      </Group>
      <StoryNote>Shade 6 is the logo colour, and the shade a filled button uses.</StoryNote>
    </Stack>
  );
}

export const Brand: Story = {
  render: () => (
    <Stack gap="xl">
      <Scale name="Purple (primary)" shades={TURVA_PURPLE} />
      <Scale name="Yellow (secondary)" shades={TURVA_YELLOW} />
    </Stack>
  ),
};

export const Status: Story = {
  render: () => (
    <Stack gap="md">
      {(Object.keys(statusColours) as StatusColourName[]).map((name) => (
        <Group key={name} gap="md" wrap="nowrap">
          <Box
            w={160}
            px="sm"
            py={6}
            style={{ background: statusColours[name].bg, color: statusTextColour(name) }}
          >
            <Text c="inherit" fw={700}>
              {name}
            </Text>
          </Box>
          <Text c={statusColours[name].fg} fw={700} w={120}>
            {name}
          </Text>
          <StoryNote mt={0}>{statusColours[name].usage}</StoryNote>
        </Group>
      ))}
    </Stack>
  ),
};

export const TextColours: Story = {
  name: "Text",
  render: () => (
    <Stack gap="md">
      {Object.entries(textColours).map(([name, colour]) => (
        <Stack key={name} gap={0}>
          <Text c={colour.value} fw={500}>
            {name}: the quick brown fox
          </Text>
          <StoryNote mt={0}>{colour.usage}</StoryNote>
        </Stack>
      ))}
    </Stack>
  ),
};
