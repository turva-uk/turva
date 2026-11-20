/**
 * RadioField Component Stories
 *
 * Demonstrates the radio button group field with various states:
 * - Default with options
 * - With a pre-selected value
 * - Disabled state
 * - With description
 * - Dark mode
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import RadioField from "./RadioField";

const sampleOptions = [
  { value: "a", label: "Option A - first choice" },
  { value: "b", label: "Option B - second choice" },
  { value: "c", label: "Option C - third choice" },
  { value: "d", label: "Option D -  fourth choice" },
];

const meta: Meta<typeof RadioField> = {
  title: "Form/Radio field",
  component: RadioField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RadioField>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>("b");
    return (
      <RadioField
        label="Select an answer"
        options={sampleOptions}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithDescription: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <RadioField
        label="Preferred contact method"
        description="Choose how you would like to be contacted"
        options={[
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
          { value: "post", label: "Post" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Required: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <RadioField
        label="Select an answer"
        options={sampleOptions}
        value={value}
        onChange={setValue}
        required
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Select an answer",
    options: sampleOptions,
    value: "c",
    onChange: () => {},
    disabled: true,
  },
};

export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <RadioField
        label="Select an answer"
        options={sampleOptions}
        value={value}
        onChange={setValue}
        error="Please select an option to continue"
      />
    );
  },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
  render: () => {
    const [value1, setValue1] = useState<string | null>("b");
    const [value2, setValue2] = useState<string | null>("a");
    const [value3, setValue3] = useState<string | null>(null);
    return (
      <Stack gap="xl">
        <BaseCard>
          <RadioField
            label="Select an answer"
            description="Choose the most appropriate option"
            options={sampleOptions}
            value={value1}
            onChange={setValue1}
            required
          />
        </BaseCard>
        <RadioField
          label="Select an answer"
          description="Choose the most appropriate option"
          options={sampleOptions}
          value={value2}
          onChange={setValue2}
          required
        />
        <BaseCard>
          <RadioField
            label="Select an answer - disabled"
            options={sampleOptions}
            value="c"
            onChange={() => {}}
            disabled
          />
        </BaseCard>
        <BaseCard>
          <RadioField
            label="Select an answer - error"
            options={sampleOptions}
            value={value3}
            onChange={setValue3}
            error="Please select an option to continue"
          />
        </BaseCard>
      </Stack>
    );
  },
};
