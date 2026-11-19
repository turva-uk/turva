/**
 * ActionCardButton Storybook Stories
 *
 * Demonstrates the ActionCardButton component used inside ActionCard.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import ActionCardButton from "./ActionCardButton";
import { StateRow, StoryNote } from "@/stories/variants";
import { Group } from "@mantine/core";

const CONTAINER_NOTE =
  "Constrained to 18rem width for display. In practice, the button is full-width and adapts to its parent container.";

const CONTAINER_WIDTH = "18rem";

const meta: Meta<typeof ActionCardButton> = {
  title: "Button/Action card button",
  component: ActionCardButton,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof ActionCardButton>;

/**
 * Default ActionCardButton rendered as a link.
 *
 * Constrained to 18rem here for display purposes.
 * In practice, the button is full-width and adapts to its parent container.
 */
export const Default: Story = {
  args: {
    label: "View details",
    url: "/example",
  },
  decorators: [
    (Story) => (
      <div>
        <div style={{ width: "18rem" }}>
          <Story />
        </div>
        <StoryNote>{CONTAINER_NOTE}</StoryNote>
      </div>
    ),
  ],
};

/**
 * Destructive: red, for an action that takes something away, such as
 * deactivating a site.
 */
export const Destructive: Story = {
  args: {
    label: "Deactivate site",
    onClick: () => undefined,
    destructive: true,
  },
  decorators: Default.decorators,
};

/**
 * All interaction states side-by-side.
 *
 * Constrained to 18rem here for display purposes.
 * In practice, the button is full-width and adapts to its parent container.
 */
export const States: Story = {
  args: {
    label: "View details",
    url: "/example",
  },
  render: () => (
    <>
      <Group gap="xl">
        <StateRow label="default" style={{ width: CONTAINER_WIDTH }}>
          <ActionCardButton label="View details" url="/example" />
        </StateRow>
        <StateRow label="hover" state="hover" style={{ width: CONTAINER_WIDTH }}>
          <ActionCardButton label="View details" url="/example" />
        </StateRow>
        <StateRow label="active" state={["hover", "active"]} style={{ width: CONTAINER_WIDTH }}>
          <ActionCardButton label="View details" url="/example" />
        </StateRow>
        <StateRow
          label="focus-visible"
          state="focus-visible"
          style={{ width: CONTAINER_WIDTH }}
        >
          <ActionCardButton label="View details" url="/example" />
        </StateRow>
        <StateRow label="disabled" style={{ width: CONTAINER_WIDTH }}>
          <ActionCardButton label="View details" url="/example" disabled />
        </StateRow>
      </Group>
      <StoryNote>{CONTAINER_NOTE}</StoryNote>
    </>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
