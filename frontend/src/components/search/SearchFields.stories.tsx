/**
 * SearchField Component Stories
 *
 * Demonstrates the collapsible search input component:
 * - Dark variant (for dark backgrounds like TopRibbon)
 * - Light variant (for white/light backgrounds like DataTable controls)
 * - Collapsed and expanded states
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import SearchField from "./SearchFields";

const meta: Meta<typeof SearchField> = {
  title: "Search/Search field",
  component: SearchField,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof SearchField>;

/**
 * Default dark variant - designed for dark backgrounds (e.g. TopRibbon).
 * White magnifying glass icon on navy background, shown in a ribbon context.
 */
export const DefaultTopRibbon: Story = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <Box
        bg="var(--brand-primary)"
        h={60}
        px="sm"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Box pt={10}>
          <Story />
        </Box>
      </Box>
    ),
  ],
};

/**
 * Light variant - designed for white/light backgrounds (e.g. DataTable controls).
 * Navy magnifying glass icon on white background.
 */
export const DefaultTable: Story = {
  args: {
    variant: "light",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <Box bg="white" p="xl">
        <Story />
      </Box>
    ),
  ],
};

/**
 * Dark mode table variant - for dark-themed table backgrounds.
 * White magnifying glass icon on dark background.
 */
export const DarkModeTable: Story = {
  args: {
    variant: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <Box
        bg="primary.8"
        p="xl"
        w="100vw"
        h="100vh"
        style={{ position: "fixed", top: 0, left: 0 }}
      >
        <Story />
      </Box>
    ),
  ],
};
