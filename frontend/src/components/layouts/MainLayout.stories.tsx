import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { fn } from "storybook/test";

import { BodyText, PageHeader } from "@/components/typography";
import MainLayout from "./MainLayout";

const meta: Meta<typeof MainLayout> = {
  title: "Layout/Main layout",
  component: MainLayout,
  parameters: { layout: "fullscreen", routerPath: "/safety-files" },
  args: {
    signedIn: true,
    onSignOut: fn(),
    children: (
      <Stack>
        <PageHeader title="Your safety files" />
        <BodyText>The page goes here, beside the side bar.</BodyText>
      </Stack>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof MainLayout>;

/** Signed in: the ribbon, the side bar and the page. */
export const SignedIn: Story = {};

/** Signed out, as on the sign-in page: the ribbon and the page alone. */
export const SignedOut: Story = {
  args: { signedIn: false },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
