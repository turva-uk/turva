/**
 * CellContent Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { ActiveStatusBadge } from "@/components/badge";
import FormattedDate from "@/components/data/Date";
import CellContent from "./CellContent";
import { StoryNote } from "@/stories/variants";

const meta: Meta<typeof CellContent> = {
  title: "Tables/Cell content",
  component: CellContent,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CellContent>;

/** Text, including a date, gets the body text style. */
export const Text: Story = {
  render: () => (
    <Stack gap="sm">
      <CellContent>Resuscitation Council UK</CellContent>
      <CellContent>
        <FormattedDate date="2026-03-14" format="medium" />
      </CellContent>
      <StoryNote>Plain text and dates are drawn as body text.</StoryNote>
    </Stack>
  ),
};

/** A control is rendered as it is, so it sits in the middle of a row. */
export const Control: Story = {
  render: () => (
    <Stack gap="sm">
      <CellContent>
        <ActiveStatusBadge active />
      </CellContent>
      <StoryNote>A badge or button is not put inside a text line.</StoryNote>
    </Stack>
  ),
};
