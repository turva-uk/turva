/**
 * AppTooltip Component Stories
 *
 * Demonstrates the design-system tooltip:
 * - Light secondary background with primary navy text
 * - BodyTextInline typography
 * - Hover delay behaviour
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import AppTooltip from "./AppTooltip";

const meta: Meta<typeof AppTooltip> = {
  title: "Tooltip/App tooltip",
  component: AppTooltip,
};

export default meta;

type Story = StoryObj<typeof AppTooltip>;

export const Default: Story = {
  render: () => (
    <div>
      <AppTooltip label="Dr Alice Smith" openDelay={0}>
        <Button>Hover me</Button>
      </AppTooltip>
      <StoryNote mt="xs">
        Hover to see tooltip with secondary background and primary text
      </StoryNote>
    </div>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <div>
      <AppTooltip label="Professor Elizabeth Montgomery-Worthington" openDelay={0}>
        <Button>Long name tooltip</Button>
      </AppTooltip>
      <StoryNote mt="xs">Longer text wraps naturally</StoryNote>
    </div>
  ),
};

export const Below: Story = {
  render: () => (
    <div>
      <AppTooltip label="Add hazard" openDelay={0} position="bottom">
        <Button>Hover me</Button>
      </AppTooltip>
      <StoryNote mt="xs">Opens below the target, as the icons above a table do</StoryNote>
    </div>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
