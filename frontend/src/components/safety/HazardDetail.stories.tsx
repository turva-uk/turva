/**
 * HazardDetail Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import HazardDetail from "./HazardDetail";
import {
  BLOCKING_HAZARD,
  MITIGATED_HAZARD,
  SAMPLE_HAZARD_OPTIONS,
  SAMPLE_MITIGATIONS,
} from "@/test/safetyFile";

const meta: Meta<typeof HazardDetail> = {
  title: "Safety/Hazard detail",
  component: HazardDetail,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof HazardDetail>;

export const Mitigated: Story = {
  args: {
    hazard: MITIGATED_HAZARD,
    mitigations: SAMPLE_MITIGATIONS,
    options: SAMPLE_HAZARD_OPTIONS,
  },
};

export const BlocksGoLive: Story = {
  args: {
    hazard: BLOCKING_HAZARD,
    mitigations: SAMPLE_MITIGATIONS,
    options: SAMPLE_HAZARD_OPTIONS,
  },
};

/** Without `hazard-options/`, each score shows as its number. */
export const WithoutOptions: Story = {
  args: { hazard: MITIGATED_HAZARD, mitigations: SAMPLE_MITIGATIONS },
};

export const DarkMode: Story = {
  ...Mitigated,
  globals: { colorScheme: "dark" },
};
