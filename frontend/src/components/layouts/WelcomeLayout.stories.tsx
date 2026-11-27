import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";

import { EmailField, PasswordField } from "@/components/form";
import { BodyText, PageHeader } from "@/components/typography";
import WelcomeLayout from "./WelcomeLayout";

const meta: Meta<typeof WelcomeLayout> = {
  title: "Layout/WelcomeLayout",
  component: WelcomeLayout,
  parameters: { layout: "padded" },
  args: {
    children: (
      <Stack>
        <PageHeader title="Sign in" />
        <EmailField label="Email address" />
        <PasswordField label="Password" />
        <BodyText c="dimmed">
          Turva manages clinical safety evidence. It does not make clinical decisions and does
          not replace a Clinical Safety Officer.
        </BodyText>
      </Stack>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof WelcomeLayout>;

/**
 * The welcome panel on the left, and the page's form on the right. Below the
 * `md` breakpoint the panel is hidden and the form fills the width: narrow the
 * window to see it.
 */
export const Wide: Story = {};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
