import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import TextAreaField from "./TextAreaField";

const meta: Meta<typeof TextAreaField> = {
  title: "Form/Text area field",
  component: TextAreaField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TextAreaField>;

export const Default: Story = {
  args: {
    label: "Message",
    placeholder: "Type your message…",
    minRows: 3,
  },
};

export const WithDescription: Story = {
  args: {
    label: "Hazard description",
    description: "Include relevant history and examination findings",
    placeholder: "Type your notes…",
    minRows: 3,
  },
};

export const WithValue: Story = {
  args: {
    label: "Message",
    value:
      "Thank you for reviewing TH-012. The mitigation has been tested on the ward for three weeks.",
    minRows: 3,
  },
};

export const Autosize: Story = {
  args: {
    label: "Notes",
    placeholder: "Describe the hazard…",
    autosize: true,
    minRows: 3,
    value:
      "The discharge summary is generated when a patient leaves hospital and sent to their GP. If the summary is delayed, or reaches the GP without the medication changes made on the ward, the GP may carry on prescribing a medicine that was stopped.\n\nExisting controls: the ward pharmacist checks every summary before it is sent, and the GP surgery is phoned when a high-risk medicine changes.\n\nProposed mitigation: the system flags a summary that has not been sent within 24 hours of discharge, and the ward clerk follows it up.",
  },
};

export const Required: Story = {
  args: {
    label: "Reason for closing",
    placeholder: "Say why this hazard can be closed",
    required: true,
    minRows: 4,
  },
};

export const Disabled: Story = {
  args: {
    label: "Previous notes",
    value:
      "A delayed discharge summary could leave a GP without the medication changes. Review in two weeks.",
    disabled: true,
    minRows: 3,
  },
};

export const WithError: Story = {
  args: {
    label: "Hazard description",
    value: "",
    placeholder: "Type your notes…",
    minRows: 3,
    error: "A hazard description is required before saving",
  },
};

export const DarkMode: Story = {
  ...WithDescription,
  globals: { colorScheme: "dark" },
  render: (args) => (
    <Stack gap="xl">
      <BaseCard>
        <TextAreaField {...args} required />
      </BaseCard>
      <TextAreaField {...args} required />
      <BaseCard>
        <TextAreaField
          label="Hazard description - disabled"
          value="A delayed discharge summary could leave a GP without the medication changes. Review in two weeks."
          disabled
          minRows={3}
        />
      </BaseCard>
      <BaseCard>
        <TextAreaField
          label="Hazard description - error"
          placeholder="Type your notes\u2026"
          minRows={3}
          error="A hazard description is required before saving"
        />
      </BaseCard>
    </Stack>
  ),
};
