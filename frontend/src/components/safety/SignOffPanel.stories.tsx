/**
 * Not yet in Turva's API: sign-off.
 *
 * SignOffPanel Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { fn } from "storybook/test";
import SignOffPanel from "./SignOffPanel";
import { SAMPLE_EXTRAS, SAMPLE_EXTRAS_FOR_CSO } from "@/test/safetyFile";

const meta: Meta<typeof SignOffPanel> = {
  decorators: [aheadOfTheApi("sign-off")],
  title: "Safety/Sign-off panel",
  component: SignOffPanel,
  parameters: { layout: "padded" },
  args: { file: SAMPLE_EXTRAS_FOR_CSO, onSign: fn() },
};

export default meta;
type Story = StoryObj<typeof SignOffPanel>;

export const ForTheCso: Story = {};

export const Approved: Story = {
  args: {
    file: {
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "approved",
      sign_offs: {
        can_approve: false,
        can_accept: false,
        two_factor_enabled: true,
        tags: ["approved/2026-11-07"],
      },
    },
  },
};

export const NoTwoFactor: Story = {
  args: {
    file: {
      ...SAMPLE_EXTRAS_FOR_CSO,
      sign_offs: {
        can_approve: true,
        can_accept: false,
        two_factor_enabled: false,
        tags: [],
      },
    },
  },
};

export const ForAReader: Story = {
  args: { file: { ...SAMPLE_EXTRAS, sign_offs: null } },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
