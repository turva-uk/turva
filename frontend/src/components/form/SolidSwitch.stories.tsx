import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { VariantRow, VariantStack } from "@/stories/variants";
import { IconMoon } from "@/components/icons/appIcons";
import ActionCard from "@/components/action-card/ActionCard";
import SolidSwitch from "./SolidSwitch";

const meta: Meta<typeof SolidSwitch> = {
  title: "Form/Solid switch",
  component: SolidSwitch,
  parameters: { layout: "padded" },
  argTypes: {
    checked: { control: "boolean", description: "Whether the switch is on" },
    label: { control: "text", description: "Label above the switch" },
    description: {
      control: "text",
      description: "Helper text below the switch",
    },
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "Switch size",
    },
  },
};
export default meta;
type Story = StoryObj<typeof SolidSwitch>;

export const Default: Story = {
  args: {
    label: "Enable feature",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Email me about changes",
    description: "Send an email when a hazard in this safety file changes",
  },
};

export const Disabled: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Disabled off">
        <SolidSwitch label="Disabled" disabled />
      </VariantRow>
      <VariantRow label="Disabled on">
        <SolidSwitch label="Disabled" disabled checked />
      </VariantRow>
    </VariantStack>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <VariantStack>
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <VariantRow
          key={size}
          label={
            size === "md"
              ? "md (desktop default)"
              : size === "xl"
                ? "xl (phone default, 44px tap target)"
                : size
          }
        >
          <SolidSwitch label="Toggle" size={size} />
          <SolidSwitch label="Toggle" size={size} checked />
        </VariantRow>
      ))}
    </VariantStack>
  ),
};

export const WithError: Story = {
  args: {
    label: "Accept terms",
    error: "You must accept the terms to continue",
  },
};

export const DarkMode: Story = {
  render: () => (
    <Stack gap="xl">
      <ActionCard
        icon={<IconMoon />}
        title="Dark mode"
        subtitle="Switch between light and dark themes"
        action={<SolidSwitch label="Enable dark mode" description="Toggle the colour scheme" />}
      />
      <SolidSwitch label="Enable dark mode" description="Toggle the colour scheme" />
    </Stack>
  ),
  globals: { colorScheme: "dark" },
};
