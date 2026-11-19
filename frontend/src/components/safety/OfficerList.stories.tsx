/**
 * Not yet in Turva's API: the safety posts in the file's organisation.
 *
 * OfficerList Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
import OfficerList from "./OfficerList";
import { SAMPLE_POSTS } from "@/test/safetyFile";

const meta: Meta<typeof OfficerList> = {
  decorators: [aheadOfTheApi("the safety posts in the file's organisation")],
  title: "Safety/Officer list",
  component: OfficerList,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof OfficerList>;

export const UnsupportedVerificationClaim: Story = {
  args: { posts: [{ ...SAMPLE_POSTS[0]!, registration_verified: true }] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("GMC 7654321, not verified")).toBeVisible();
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "does not check professional registers",
    );
  },
};

export const Default: Story = { args: { posts: SAMPLE_POSTS } };

export const Editable: Story = {
  args: { posts: SAMPLE_POSTS, onEdit: fn() },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
