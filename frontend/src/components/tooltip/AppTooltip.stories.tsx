/**
 * AppTooltip Component Stories
 *
 * Demonstrates the design-system tooltip:
 * - Paired light/dark surfaces and normal text colours
 * - BodyTextInline typography
 * - Keyboard focus and hover delay behaviour
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Stack } from "@mantine/core";
import { expect, userEvent, waitFor, within } from "storybook/test";
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

/** Leave the hint open so the accessibility add-on checks the rendered text. */
export const KeyboardFocus: Story = {
  render: () => (
    <Stack align="flex-start">
      <Button variant="default">Previous control</Button>
      <AppTooltip label="Additional review guidance" openDelay={0}>
        <Button>Review target</Button>
      </AppTooltip>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "Previous control" }).focus();
    await userEvent.tab();
    const target = canvas.getByRole("button", { name: "Review target" });
    await expect(target).toHaveFocus();
    const tooltip = await within(canvasElement.ownerDocument.body).findByRole("tooltip");
    await expect(target).toHaveAttribute("aria-describedby", tooltip.id);
    // A fading-in tooltip is excluded by axe. Wait for its final colours.
    await waitFor(() => expect(getComputedStyle(tooltip).opacity).toBe("1"));
  },
};

export const DarkKeyboardFocus: Story = {
  ...KeyboardFocus,
  globals: { colorScheme: "dark" },
};
