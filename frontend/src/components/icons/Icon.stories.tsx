/**
 * Icon Component Stories
 *
 * Demonstrates the Icon component with all available icons used in the
 * application, displayed in a 5-column grid with labels.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group, SimpleGrid, Stack } from "@mantine/core";
import { IconPencil, IconCheck, IconX } from "@/components/icons/appIcons";
import Icon from "./Icon";
import { iconCatalogue } from "./appIcons";
// A Mantine Paper stands in for BaseCard until the shared cards arrive in the
// next phase.
import { Paper } from "@mantine/core";
import { statusColours } from "@/styles/semanticColours";
import { VariantRow, VariantStack, StoryNote } from "@/stories/variants";

/**
 * Icon component provides consistent sizing for Tabler icons.
 *
 * **Size Variants (Desktop ≥640px):**
 * - `sm` (20px): Inputs, small buttons, inline text
 * - `md` (28px): Default size, general UI elements
 * - `lg` (48px): Action cards, prominent features
 *
 * **Size Variants (Mobile <640px):**
 * - `sm` (16px): Inputs, small buttons, inline text
 * - `md` (20px): Default size, general UI elements
 * - `lg` (32px): Action cards, prominent features
 *
 * Icons automatically scale down on mobile for better touch targets and visual balance.
 */
const meta = {
  title: "Icons/Icon",
  component: Icon,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All available icons used in the application, displayed in a 5-column grid.
 */
export const Default: Story = {
  args: {
    icon: <IconPencil />,
    size: "md",
  },
  render: () => (
    <SimpleGrid cols={5} spacing="lg" style={{ maxWidth: 700 }}>
      {Object.entries(iconCatalogue).map(([name, IconComponent]) => (
        <Paper key={name} withBorder p="md" ta="center">
          <Stack gap="xs" align="center">
            <Icon icon={<IconComponent />} size="lg" />
            <StoryNote mt={0}>{name.replace(/([A-Z])/g, " $1").trim()}</StoryNote>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  ),
};

/**
 * All sizes comparison - sm, md, lg, and xl with a single icon.
 */
export const AllSizes: Story = {
  args: {
    icon: <IconPencil />,
    size: "md",
  },
  render: () => (
    <VariantStack>
      {(["sm", "md", "mlg", "lg", "xl"] as const).map((size) => (
        <VariantRow key={size} label={size === "md" ? "md (default)" : size}>
          <Icon icon={<IconPencil />} size={size} />
        </VariantRow>
      ))}
    </VariantStack>
  ),
};

/**
 * Icons with status colours from the design system.
 */
export const WithColour: Story = {
  parameters: { layout: "padded" },
  args: {
    icon: <IconPencil />,
    size: "lg",
  },
  render: () => (
    <Group gap="lg">
      <Stack gap="xs" align="center">
        <Icon icon={<IconCheck />} size="lg" colour="var(--mantine-color-teal-filled)" />
        <StoryNote mt={0}>Success</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconPencil />} size="lg" colour="var(--mantine-color-blue-filled)" />
        <StoryNote mt={0}>Info</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconX />} size="lg" colour="var(--mantine-color-red-filled)" />
        <StoryNote mt={0}>Alert</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconPencil />} size="lg" colour="var(--mantine-color-cyan-6)" />
        <StoryNote mt={0}>Warning</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconPencil />} size="lg" colour="var(--mantine-color-violet-filled)" />
        <StoryNote mt={0}>Accent</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconPencil />} size="lg" />
        <StoryNote mt={0}>Default</StoryNote>
      </Stack>
    </Group>
  ),
};

/**
 * Icons with a circular container background using status colours.
 */
export const WithContainer: Story = {
  parameters: { layout: "padded" },
  args: {
    icon: <IconPencil />,
    size: "md",
  },
  render: () => (
    <Group gap="lg">
      <Stack gap="xs" align="center">
        <Icon icon={<IconCheck />} container={statusColours.success.bg} />
        <StoryNote mt={0}>Light success</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconX />} container={statusColours.alert.bg} />
        <StoryNote mt={0}>Light alert</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon
          icon={<IconCheck />}
          container={statusColours.success.bg}
          containerVariant="filled"
        />
        <StoryNote mt={0}>Filled success</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconX />} container={statusColours.alert.bg} containerVariant="filled" />
        <StoryNote mt={0}>Filled alert</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon icon={<IconPencil />} container={statusColours.info.bg} />
        <StoryNote mt={0}>Light info</StoryNote>
      </Stack>
      <Stack gap="xs" align="center">
        <Icon
          icon={<IconPencil />}
          container={statusColours.accent.bg}
          containerVariant="filled"
        />
        <StoryNote mt={0}>Filled accent</StoryNote>
      </Stack>
    </Group>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
