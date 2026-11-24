import type { Meta, StoryObj } from "@storybook/react-vite";

import Footer from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Layout/Footer",
  component: Footer,
  parameters: { layout: "fullscreen" },
  args: { text: "Signed in as Dr Anita Patel" },
};

export default meta;

type Story = StoryObj<typeof Footer>;

/** Who is signed in, on the right. */
export const SignedIn: Story = {};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
