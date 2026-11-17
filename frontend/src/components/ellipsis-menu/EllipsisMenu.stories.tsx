import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Stack } from "@mantine/core";
import { IconPencil, IconTrash } from "@/components/icons/appIcons";
import BaseCard from "@/components/base-card/BaseCard";
import { StoryNote } from "@/stories/variants";
import EllipsisMenu from "./EllipsisMenu";

const meta: Meta<typeof EllipsisMenu> = {
  title: "Button/Ellipsis menu",
  component: EllipsisMenu,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof EllipsisMenu>;

export const Default: Story = {
  args: {
    "aria-label": "Actions",
    items: [
      { label: "Edit", icon: <IconPencil />, onClick: fn() },
      {
        label: "Delete",
        icon: <IconTrash />,
        color: "var(--alert-color)",
        onClick: fn(),
      },
    ],
  },
  render: (args) => (
    <Stack gap="md">
      <EllipsisMenu {...args} />
      <StoryNote>Click on button to open up menu</StoryNote>
    </Stack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
  render: (args) => (
    <Stack gap="xl">
      <BaseCard>
        <Stack gap="md">
          <StoryNote>Inside card</StoryNote>
          <EllipsisMenu {...args} />
        </Stack>
      </BaseCard>
      <EllipsisMenu {...args} />
    </Stack>
  ),
};
