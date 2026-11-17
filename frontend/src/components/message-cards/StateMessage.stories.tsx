/**
 * StateMessage Component Stories
 *
 * Demonstrates informational alert messages for different application states.
 * All content is passed via props - icon, title, description, and colour.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryNote } from "@/stories/variants";
import { Stack } from "@mantine/core";
import StateMessage from "./StateMessage";
import { IconClock } from "@/components/icons/appIcons";
import { statusColours, type StatusColourName } from "@/styles/semanticColours";

const meta: Meta<typeof StateMessage> = {
  title: "Message cards/State message",
  component: StateMessage,
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof StateMessage>;

/**
 * Every status colour as a full card.
 *
 * Driven off the palette rather than a hand-written list, so a colour
 * added later shows up here without anybody remembering to add it -
 * which is how `update` came to be the only one whose text colour had
 * ever been checked at this size.
 */
function AllColours() {
  const names = Object.keys(statusColours) as StatusColourName[];

  return (
    <Stack gap="md">
      {names.map((name) => (
        <StateMessage
          key={name}
          colour={name}
          icon={<IconClock />}
          title={name.charAt(0).toUpperCase() + name.slice(1)}
          description={statusColours[name].usage}
        />
      ))}
    </Stack>
  );
}

export const Default: Story = {
  render: () => (
    <Stack gap="md">
      <StoryNote>Props include a status colour, icon and message</StoryNote>
      <AllColours />
    </Stack>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
