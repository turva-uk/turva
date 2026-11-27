import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import SideNav from "@/components/navigation/SideNav";
import NavigationDrawer from "./NavigationDrawer";

const meta: Meta<typeof NavigationDrawer> = {
  title: "Layout/Navigation drawer",
  component: NavigationDrawer,
  parameters: { layout: "fullscreen" },
  args: { opened: true, onClose: fn() },
  render: (args) => (
    <NavigationDrawer {...args}>
      <SideNav onSignOut={fn()} onNavigate={args.onClose} />
    </NavigationDrawer>
  ),
};

export default meta;

type Story = StoryObj<typeof NavigationDrawer>;

/** Open on a narrow screen, with the side bar inside. */
export const Open: Story = {};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
