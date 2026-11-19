/**
 * FormStatusNarrow Storybook Stories
 *
 * Demonstrates the compact inline error display,
 * using prop-driven mode (no Form context required).
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paper, Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import FormStatusNarrow from "./FormStatusNarrow";

const meta: Meta<typeof FormStatusNarrow> = {
  title: "Form/Form status narrow",
  component: FormStatusNarrow,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof FormStatusNarrow>;

export const Default: Story = {
  render: () => (
    <Paper maw={380} mx="auto" p="lg" radius="md" withBorder>
      <FormStatusNarrow message="Invalid username or password" />
    </Paper>
  ),
};

export const AllExamples: Story = {
  render: () => (
    <Paper maw={380} mx="auto" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Stack gap="xs">
          <StoryNote>Server error</StoryNote>
          <FormStatusNarrow message="Invalid username or password" />
        </Stack>
        <Stack gap="xs">
          <StoryNote>Validation error</StoryNote>
          <FormStatusNarrow message="Passwords do not match" />
        </Stack>
        <Stack gap="xs">
          <StoryNote>Timeout</StoryNote>
          <FormStatusNarrow message="Request timed out. Please try again." />
        </Stack>
        <Stack gap="xs">
          <StoryNote>Long message</StoryNote>
          <FormStatusNarrow message="A user with that email address already exists. Please use a different email or sign in to your existing account." />
        </Stack>
      </Stack>
    </Paper>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
