/**
 * Not yet in Turva's API: the safety posts in the file's organisation.
 *
 * OfficerList Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

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

export const Default: Story = { args: { posts: SAMPLE_POSTS } };

export const Editable: Story = {
  args: { posts: SAMPLE_POSTS, onEdit: fn() },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
