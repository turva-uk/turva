import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import PublicNavIcon from "./PublicNavIcon";
import type { PublicNavIconName } from "./PublicNavIcon";
import { VariantRow, VariantStack } from "@/stories/variants";
import { BRAND_BACKDROP } from "@/stories/backdrops";

const iconNames: PublicNavIconName[] = [
  "home",
  "teaching",
  "learning",
  "assessments",
  "educators",
  "book",
  "pricing",
  "database",
  "mail",
];

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

const meta = {
  title: "Public/Icons/Public nav icon",
  component: PublicNavIcon,
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
  argTypes: {
    name: {
      description: "The name of the icon to display",
      control: "select",
      options: iconNames,
    },
    size: {
      description: "The size preset for the icon",
      control: "select",
      options: [...sizes],
    },
  },
} satisfies Meta<typeof PublicNavIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All available public navigation icons at default size. */
export const Default: Story = {
  args: {
    name: "home",
  },
  render: () => (
    <Group gap="md">
      {iconNames.map((name) => (
        <PublicNavIcon key={name} name={name} />
      ))}
    </Group>
  ),
};

/** All sizes with all icons per row. */
export const AllSizes: Story = {
  args: {
    name: "home",
  },
  render: () => (
    <VariantStack>
      {sizes.map((size) => (
        <VariantRow key={size} label={size === "lg" ? `${size} (default)` : size}>
          {iconNames.map((name) => (
            <PublicNavIcon key={name} name={name} size={size} />
          ))}
        </VariantRow>
      ))}
    </VariantStack>
  ),
};
