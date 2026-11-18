import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import DateField from "./DateField";
import { StoryNote } from "@/stories/variants";
import { userEvent, within } from "storybook/test";

const meta: Meta<typeof DateField> = {
  title: "Form/Date field",
  component: DateField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DateField>;

export const Default: Story = {
  args: {
    label: "Observed on",
  },
};

export const WithValue: Story = {
  args: {
    label: "Observed on",
    defaultValue: "2026-03-12",
  },
};

/** Keep popup controls in browser accessibility and narrow-layout coverage. */
export const OpenCalendar: Story = {
  args: { label: "Review date", defaultValue: "2026-04-03" },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("textbox", { name: "Review date" }));
  },
};

export const WithDescription: Story = {
  args: {
    label: "Performed on",
    description: "The day the incident happened, not the day you logged it",
  },
};

export const Required: Story = {
  args: {
    label: "Observed on",
    required: true,
  },
};

export const NoFutureDates: Story = {
  render: () => (
    <Stack gap="sm">
      <DateField
        label="Performed on"
        maxDate={new Date()}
        description="Future dates cannot be chosen"
      />
      <StoryNote>
        A logbook entry records something that already happened, so the form that uses this
        passes `maxDate`. The field itself imposes no such rule - a certificate expiry is
        legitimately in the future.
      </StoryNote>
    </Stack>
  ),
};

export const WithError: Story = {
  args: {
    label: "Observed on",
    error: "Enter the date you observed this",
  },
};

export const Clearable: Story = {
  args: {
    label: "Expires on",
    defaultValue: "2027-03-14",
    clearable: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Signed on",
    defaultValue: "2026-03-14",
    disabled: true,
  },
};
