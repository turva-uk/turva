import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import PasswordField from "./PasswordField";

const meta: Meta<typeof PasswordField> = {
  title: "Form/Password field",
  component: PasswordField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PasswordField>;

export const Default: Story = {
  args: {
    label: "Password",
    placeholder: "Enter your password",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Password",
    description: "Must be at least 8 characters with one uppercase letter",
    placeholder: "Enter your password",
  },
};

export const Required: Story = {
  args: {
    label: "Password",
    placeholder: "Enter your password",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Password",
    value: "secret123",
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    value: "pass",
    error: "Password must be at least 8 characters",
  },
};

export const DarkMode: Story = {
  ...WithDescription,
  globals: { colorScheme: "dark" },
  render: (args) => (
    <Stack gap="xl">
      <BaseCard>
        <PasswordField {...args} required />
      </BaseCard>
      <PasswordField {...args} required />
      <BaseCard>
        <PasswordField label="Password - disabled" value="secret123" disabled />
      </BaseCard>
      <BaseCard>
        <PasswordField
          label="Password - error"
          value="pass"
          error="Password must be at least 8 characters"
        />
      </BaseCard>
    </Stack>
  ),
};
