/**
 * FormStatus Storybook Stories
 *
 * Demonstrates the FormStatus component in all variants,
 * using prop-driven mode (no Form context required).
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import FormStatus from "./FormStatus";

const meta: Meta<typeof FormStatus> = {
  title: "Form/Form status",
  component: FormStatus,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof FormStatus>;

/**
 * All variants side by side
 */
export const AllVariants: Story = {
  render: () => (
    <Stack gap="lg">
      <Stack gap="xs">
        <StoryNote>success</StoryNote>
        <FormStatus
          variant="success"
          title="Settings saved"
          description="Your changes have been applied."
        />
      </Stack>
      <Stack gap="xs">
        <StoryNote>error</StoryNote>
        <FormStatus
          variant="error"
          title="Failed to save"
          description="The server returned an error. Please try again."
        />
      </Stack>
      <Stack gap="xs">
        <StoryNote>partial_success</StoryNote>
        <FormStatus
          variant="partial_success"
          title="Partially saved"
          description="Hazard saved. The safety file has not been signed off yet."
        />
      </Stack>
      <Stack gap="xs">
        <StoryNote>timeout</StoryNote>
        <FormStatus
          variant="timeout"
          title="Request timed out"
          description="The server did not respond in time. Your changes may not have been saved."
        />
      </Stack>
      <Stack gap="xs">
        <StoryNote>validation_error</StoryNote>
        <FormStatus
          variant="validation_error"
          title="Please check the highlighted fields"
          description="2 fields need attention."
        />
      </Stack>
    </Stack>
  ),
};

/**
 * Dark mode
 */
export const DarkMode: Story = {
  ...AllVariants,
  globals: { colorScheme: "dark" },
};
