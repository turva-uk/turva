/**
 * MitigationDetail Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import MitigationDetail from "./MitigationDetail";
import { FLAGGING_MITIGATION, SAMPLE_HAZARDS } from "@/test/safetyFile";

const meta: Meta<typeof MitigationDetail> = {
  title: "Safety/Mitigation detail",
  component: MitigationDetail,
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
  args: {
    mitigation: FLAGGING_MITIGATION,
    hazards: SAMPLE_HAZARDS,
    hazardHref: (id: string) => `/safety-files/demo/hazards/${id}`,
  },
};

export default meta;
type Story = StoryObj<typeof MitigationDetail>;

export const Implemented: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: /^HAZ-001: / })).toBeInTheDocument();
  },
};

/** With a narrative, shown as the Markdown source that was saved. */
export const WithNarrative: Story = {
  args: {
    mitigation: {
      ...FLAGGING_MITIGATION,
      body: "## How it was verified\n\nReplayed the pilot's readings against the threshold.",
    },
  },
};

/** A proposed control with no evidence yet, linked to nothing. */
export const Proposed: Story = {
  args: {
    mitigation: {
      ...FLAGGING_MITIGATION,
      status: "proposed",
      evidence: "",
      hazards: [],
    },
  },
};

/** A linked hazard whose details were not supplied says so, rather than vanishing. */
export const LinkedHazardMissing: Story = {
  args: { mitigation: { ...FLAGGING_MITIGATION, hazards: ["HAZ-001", "HAZ-099"] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("HAZ-099");
  },
};

export const DarkMode: Story = {
  args: WithNarrative.args,
  globals: { colorScheme: "dark" },
};
