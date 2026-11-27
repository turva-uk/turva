import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mantine/core";
import { fn } from "storybook/test";

import { LAYOUT_SIDEBAR_WIDTH } from "@/components/layouts/layoutConstants";
import NavSublinkProvider from "./NavSublinkProvider";
import { usePageSublink } from "./pageSublink";
import SideNav from "./SideNav";

/** Stands in for the organisation page, which names its own sublink. */
function OrganisationSublink() {
  usePageSublink({
    parent: "/organisations",
    to: "/organisations/riverbank-health-federation",
    label: "Riverbank Health Federation",
  });

  return null;
}

/** Stands in for the file team page, which names a trail two deep. */
function FileTeamSublinks() {
  usePageSublink([
    {
      parent: "/safety-files",
      to: "/safety-files/demo-bp-at-home",
      label: "BP@Home remote blood pressure monitoring",
    },
    {
      parent: "/safety-files/demo-bp-at-home",
      to: "/safety-files/demo-bp-at-home/team",
      label: "File team",
    },
  ]);

  return null;
}

const meta: Meta<typeof SideNav> = {
  title: "Layout/Side navigation",
  component: SideNav,
  // Full screen, as the side bar runs from the ribbon to the bottom of the
  // screen in the app, so "Sign out" sits at the very foot of the frame.
  parameters: { layout: "fullscreen" },
  args: { onSignOut: fn(), onNavigate: fn() },
  decorators: [
    (Story) => (
      <Box w={LAYOUT_SIDEBAR_WIDTH} h="100dvh">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SideNav>;

/** The three links, with Sign out at the foot. */
export const Default: Story = {};

/** Reading a hazard: "Safety files" is marked as the current section. */
export const InASafetyFile: Story = {
  parameters: { routerPath: "/safety-files/demo-bp-at-home/hazards/HAZ-001" },
};

/** On "Your profile": it shows beneath Settings, marked as the current page. */
export const InSettings: Story = {
  parameters: { routerPath: "/settings/profile" },
};

/** Signing out is under way. */
export const SigningOut: Story = {
  args: { signingOut: true },
};

export const DarkMode: Story = {
  parameters: { routerPath: "/settings/profile" },
  globals: { colorScheme: "dark" },
};

/**
 * On an organisation's page: the page names itself beneath Organisations,
 * in place of a link back to the list.
 */
export const InAnOrganisation: Story = {
  parameters: { routerPath: "/organisations/riverbank-health-federation" },
  decorators: [
    (Story) => (
      <NavSublinkProvider>
        <OrganisationSublink />
        <Story />
      </NavSublinkProvider>
    ),
  ],
};

/**
 * On a file's team page: the file names itself beneath Safety files, and
 * "File team" sits beneath the file, indented once more.
 */
export const InAFileTeam: Story = {
  parameters: { routerPath: "/safety-files/demo-bp-at-home/team" },
  decorators: [
    (Story) => (
      <NavSublinkProvider>
        <FileTeamSublinks />
        <Story />
      </NavSublinkProvider>
    ),
  ],
};
