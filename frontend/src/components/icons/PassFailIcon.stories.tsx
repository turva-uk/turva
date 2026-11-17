/**
 * PassIcon and FailIcon Stories
 *
 * Demonstrates the atomic pass/fail indicator icons used in
 * assessments and score breakdowns.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Group } from "@mantine/core";
import PassIcon from "./PassIcon";
import FailIcon from "./FailIcon";
import { BodyTextInline } from "@/components/typography";
import { VariantRow, VariantStack } from "@/stories/variants";

const meta: Meta = {
  title: "Icons/Pass fail icon",
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj;

/** Default pass and fail icons side by side. */
export const Default: Story = {
  render: () => (
    <Group gap="lg">
      <Group gap="xs">
        <PassIcon />
        <BodyTextInline>Pass</BodyTextInline>
      </Group>
      <Group gap="xs">
        <FailIcon />
        <BodyTextInline>Fail</BodyTextInline>
      </Group>
    </Group>
  ),
};

/** All size variants for both icons. */
export const AllSizes: Story = {
  render: () => (
    <VariantStack>
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <VariantRow key={size} label={size === "sm" ? "sm (default)" : size}>
          <PassIcon size={size} />
          <FailIcon size={size} />
        </VariantRow>
      ))}
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
