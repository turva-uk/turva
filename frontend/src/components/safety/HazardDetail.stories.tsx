/**
 * HazardDetail Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
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
  decorators: [
    (Story) => (
      <Stack>
        <Story />
        <StoryNote>
          Fictional recorded evidence for interface testing. These sample claims have not been
          clinically assessed or approved.
        </StoryNote>
      </Stack>
    ),
  ],
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

export const MissingLinkedEvidence: Story = {
  args: { hazard: MITIGATED_HAZARD, mitigations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("MIT-001");
    await expect(canvas.queryByText("No mitigation is recorded against it.")).toBeNull();
  },
};

export const ClosedWithHighResidualRisk: Story = {
  args: {
    hazard: {
      ...BLOCKING_HAZARD,
      status: "closed",
      justification: "Fictional recorded closure; the assessment is unchanged.",
    },
    mitigations: [],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/does not by itself reduce that assessment/),
    ).toBeVisible();
  },
};
