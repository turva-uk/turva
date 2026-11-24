import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { fn } from "storybook/test";

import { CheckboxField, SelectField, TextField } from "@/components/form";
import MultiStepForm from "./MultiStepForm";
import type { StepConfig } from "./MultiStepForm";

const steps: StepConfig[] = [
  {
    label: "Identity",
    content: () => (
      <Stack>
        <TextField label="First name" defaultValue="Anita" />
        <TextField label="Last name" defaultValue="Patel" />
      </Stack>
    ),
  },
  {
    label: "Registration",
    content: () => (
      <Stack>
        <SelectField
          label="Professional regulator"
          placeholder="No regulator recorded"
          data={[{ value: "GMC", label: "General Medical Council (GMC)" }]}
          defaultValue="GMC"
        />
        <TextField label="Registration number" defaultValue="7654321" />
      </Stack>
    ),
  },
  {
    label: "Declaration",
    nextButtonLabel: "Save profile",
    content: () => <CheckboxField label="I act as a Clinical Safety Officer" defaultChecked />,
  },
];

const meta: Meta<typeof MultiStepForm> = {
  title: "Form/Multi step form",
  component: MultiStepForm,
  parameters: { layout: "padded" },
  args: { steps, onCancel: fn(), onSubmit: fn() },
};

export default meta;

type Story = StoryObj<typeof MultiStepForm>;

/** The first step: Cancel leaves, and Next checks the step and moves on. */
export const FirstStep: Story = {};

/** A middle step, with Back and Next. */
export const MiddleStep: Story = {
  args: { activeStep: 1, allStepsAccessible: true },
};

/** The last step, whose button saves. */
export const LastStep: Story = {
  args: { activeStep: 2, allStepsAccessible: true },
};

export const DarkMode: Story = {
  args: { activeStep: 1, allStepsAccessible: true },
  globals: { colorScheme: "dark" },
};
