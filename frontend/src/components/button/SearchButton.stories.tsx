/**
 * SearchButton Stories
 *
 * Demonstrates the search toggle button on a navy background,
 * matching its appearance on the top ribbon.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import SearchButton from "./SearchButton";

const meta: Meta<typeof SearchButton> = {
  title: "Button/Search button",
  component: SearchButton,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: "var(--brand-primary)",
          padding: "1rem",
          minHeight: "100vh",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchButton>;

/** Default state - white magnifying glass on navy background. */
export const Default: Story = {
  args: {
    onClick: () => {},
  },
};
