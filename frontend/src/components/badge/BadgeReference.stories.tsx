/**
 * Badge Reference Storybook Stories
 *
 * Displays all available badge colours and loading states.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Box, Stack } from "@mantine/core";
import { badgeColours, BADGE_VARIANT, type BadgeColour } from "./badgeColours";
import BadgeSkeleton from "./BadgeSkeleton";
import ActiveStatusBadge from "./ActiveStatusBadge";

const meta: Meta = {
  title: "Badge/Reference",
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj;

const allColours = Object.entries(badgeColours) as [
  BadgeColour,
  { bg: string; text: string },
][];

/** All available badge colours displayed in a column. */
export const AllColours: Story = {
  render: () => (
    <Stack gap="md" align="flex-start">
      {allColours.map(([name, { bg, text }]) => (
        <Badge key={name} color={bg} c={text} variant={BADGE_VARIANT}>
          {name}
        </Badge>
      ))}
      <BadgeSkeleton />
    </Stack>
  ),
};

/** Loading skeleton. */
export const Loading: Story = {
  render: () => <ActiveStatusBadge active={true} isLoading />,
};

/**
 * A badge in a container narrower than its text stays whole: one line,
 * its usual size, no ellipsis. It runs past the container rather than
 * shrinking to fit it.
 */
export const NarrowContainer: Story = {
  render: () => (
    <Box w={160}>
      <Stack gap="md" align="flex-start">
        <Badge
          color={badgeColours.warning.bg}
          c={badgeColours.warning.text}
          variant={BADGE_VARIANT}
          radius="xl"
        >
          Awaiting supervisor sign-off
        </Badge>
        <Badge
          color={badgeColours.info.bg}
          c={badgeColours.info.text}
          variant={BADGE_VARIANT}
          radius="xl"
        >
          Electroencephalography
        </Badge>
      </Stack>
    </Box>
  ),
};

export const DarkMode: Story = {
  ...AllColours,
  globals: { colorScheme: "dark" },
};
