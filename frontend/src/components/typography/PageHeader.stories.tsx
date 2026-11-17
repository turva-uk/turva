import type { Meta, StoryObj } from "@storybook/react-vite";
import PageHeader from "./PageHeader";
import BodyText from "./BodyText";
// A plain Mantine button stands in for the header action until the shared
// buttons (AddButton, IconTextButton) arrive in the next phase.
import { Box, Button, Stack } from "@mantine/core";
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
    action: <Button>Add hazard</Button>,
  },
};

/**
 * Too narrow for both on one line: the action wraps under the title and
 * stays on the right.
 */
export const WithActionWrapped: Story = {
  args: {
    title: "Safety file team",
    action: <Button>Invite a colleague</Button>,
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
    action: <Button>Settings</Button>,
    actionAlign: "center",
  },
};

/** A line qualifying the title, such as the place the page is about. */
export const WithSubtitle: Story = {
  args: {
    title: "Discharge summary",
    subtitle: "Safety file for Example NHS Trust",
    action: <Button>Download</Button>,
  },
};

export const DarkMode: Story = {
  ...WithSubtitle,
  globals: { colorScheme: "dark" },
};
