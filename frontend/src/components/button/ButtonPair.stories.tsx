/**
 * ButtonPair Storybook Stories
 *
 * Demonstrates the ButtonPair component for accept/cancel actions.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Loader } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import ButtonPair from "./ButtonPair";

const meta: Meta<typeof ButtonPair> = {
  title: "Button/Button pair",
  component: ButtonPair,
  parameters: {
    layout: "padded",
  },
  args: {
    onAccept: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ButtonPair>;

/** Default button pair */
export const Default: Story = {};

/** Accept button disabled */
export const AcceptDisabled: Story = {
  args: {
    acceptDisabled: true,
  },
};

/** Accept button in submitting state */
export const Submitting: Story = {
  args: {
    acceptDisabled: true,
    acceptChildren: (
      <span style={{ display: "grid", placeItems: "center" }}>
        <span style={{ gridArea: "1/1", visibility: "hidden" }}>Accept</span>
        <span
          style={{
            gridArea: "1/1",
            visibility: "visible",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Loader size="xs" color="white" aria-hidden="true" />
          Saving…
        </span>
      </span>
    ),
  },
};

/**
 * At the foot of a page longer than the screen: the pair stays in view
 * while the page scrolls under it.
 */
export const Sticky: Story = {
  args: { acceptLabel: "Save document", sticky: true },
  decorators: [
    (Story) => (
      <>
        {Array.from({ length: 40 }, (_, line) => (
          <StoryNote key={line}>
            Line {line + 1} of a long page, scrolling under the buttons.
          </StoryNote>
        ))}
        <Story />
      </>
    ),
  ],
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};

/** Full-width buttons at all screen sizes */
export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
};
