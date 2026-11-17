import type { Meta, StoryObj } from "@storybook/react-vite";
import BodyText from "./BodyText";
import ExternalTextLink from "./ExternalTextLink";

const meta: Meta<typeof ExternalTextLink> = {
  title: "Foundations/Typography/External text link",
  component: ExternalTextLink,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ExternalTextLink>;

export const Default: Story = {
  args: {
    href: "https://turva.org/privacy",
    children: "privacy policy",
  },
};

/** Where it is used: part of a sentence, keeping the line height. */
export const InASentence: Story = {
  ...Default,
  render: (args) => (
    <BodyText>
      You can read our <ExternalTextLink {...args} /> at any time.
    </BodyText>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
