import type { Meta, StoryObj } from "@storybook/react-vite";
import PageHeader from "./PageHeader";
import BodyText from "./BodyText";
import { Box, Stack } from "@mantine/core";
import AddButton from "@/components/button/AddButton";
import IconTextButton from "@/components/button/IconTextButton";
import { StoryNote } from "@/stories/variants";

const meta = {
  title: "Foundations/Typography/Page header",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <Box maw={800}>
        <Stack gap="sm">
          <Story />
          <BodyText>
            This is body text underneath the page header to show relative sizing.
          </BodyText>
        </Stack>
      </Box>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Safety files",
  },
};

/** An "Add" button, the most common header action. */
export const WithAction: Story = {
  args: {
    title: "Hazards",
    action: <AddButton label="Add hazard" />,
  },
};

/**
 * Too narrow for both on one line: the action wraps under the title and
 * stays on the right.
 */
export const WithActionWrapped: Story = {
  args: {
    title: "Safety file team",
    action: <IconTextButton icon="userPlus" label="Invite a colleague" />,
  },
  render: (args) => (
    <>
      <Box maw={320}>
        <PageHeader {...args} />
      </Box>
      <StoryNote>Constrained to 320px, as on a phone.</StoryNote>
    </>
  ),
};

/** Something shorter than the title, such as a badge, centred against it. */
export const WithCentredAction: Story = {
  args: {
    title: "Administration",
    action: <IconTextButton icon="settings" label="Settings" />,
    actionAlign: "center",
  },
};

/** A line qualifying the title, such as the place the page is about. */
export const WithSubtitle: Story = {
  args: {
    title: "Discharge summary",
    subtitle: "Safety file for Example NHS Trust",
    action: <IconTextButton icon="download" label="Download" />,
  },
};

export const DarkMode: Story = {
  ...WithSubtitle,
  globals: { colorScheme: "dark" },
};
