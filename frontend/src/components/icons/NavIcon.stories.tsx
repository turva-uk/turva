/**
 * NavIcon Component Stories
 *
 * Demonstrates the navigation icon component:
 * - Different icon types (home, settings, logout, user, bell, message, file, adjustments, building-community)
 * - Size presets (xs, sm, md, lg, xl)
 * - Accessible labeling
 * - Used in navigation menus and buttons
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack, Group } from "@mantine/core";
import NavIcon from "./NavIcon";
import { StoryNote } from "@/stories/variants";

const iconNames = [
  "home",
  "settings",
  "logout",
  "user",
  "bell",
  "message",
  "file",
  "adjustments",
  "building-community",
  "feedback",
  "safety",
] as const;

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

const meta = {
  title: "Icons/Nav icon",
  component: NavIcon,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    name: {
      description: "The name of the icon to display",
      control: "select",
      options: [...iconNames],
    },
    size: {
      description: "The size preset for the icon",
      control: "select",
      options: [...sizes],
    },
  },
} satisfies Meta<typeof NavIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All available navigation icons at default size.
 */
export const Default: Story = {
  args: {
    name: "home",
  },
  render: () => (
    <Group gap="md">
      {iconNames.map((name) => (
        <NavIcon key={name} name={name} />
      ))}
    </Group>
  ),
};

/**
 * All sizes with all icons per row.
 */
export const AllSizes: Story = {
  args: {
    name: "home",
  },
  render: () => (
    <Stack gap="lg">
      {sizes.map((size) => (
        <div key={size}>
          <Group gap="md">
            {iconNames.map((name) => (
              <NavIcon key={name} name={name} size={size} />
            ))}
          </Group>
          <StoryNote mt="xs">{size === "lg" ? `${size} (default)` : size}</StoryNote>
        </div>
      ))}
    </Stack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
