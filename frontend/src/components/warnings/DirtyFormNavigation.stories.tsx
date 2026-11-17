/**
 * DirtyFormNavigation Storybook Stories
 *
 * Interactive example of the navigation blocker modal warning users
 * about unsaved changes when attempting to navigate away.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { Location } from "react-router";
import ActionCardButton from "@/components/button/ActionCardButton";
import { StoryNote } from "@/stories/variants";
import DirtyFormNavigation from "./DirtyFormNavigation";

const mockLocation: Location = {
  pathname: "/admin/users/new",
  search: "",
  hash: "",
  state: null,
  key: "default",
};

const meta = {
  title: "Warnings/Dirty form navigation",
  component: DirtyFormNavigation,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Modal that warns users when attempting to navigate away from a page with unsaved form changes. Uses React Router's useBlocker functionality.",
      },
    },
  },
} satisfies Meta<typeof DirtyFormNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive story showing the modal when navigation is blocked.
 * Click "Leave dirty form" to trigger the modal.
 */
export const Interactive: Story = {
  render: () => {
    const [isBlocked, setIsBlocked] = useState(false);

    const blocker = isBlocked
      ? {
          state: "blocked" as const,
          reset: () => setIsBlocked(false),
          proceed: () => setIsBlocked(false),
          location: mockLocation,
        }
      : {
          state: "unblocked" as const,
          reset: undefined,
          proceed: undefined,
          location: undefined,
        };

    return (
      <div style={{ padding: "2rem" }}>
        <StoryNote>
          Click the button below to simulate attempting to navigate away from a form with
          unsaved changes.
        </StoryNote>
        <div style={{ width: 300 }}>
          <ActionCardButton label="Leave dirty form" onClick={() => setIsBlocked(true)} />
        </div>
        <DirtyFormNavigation blocker={blocker} />
      </div>
    );
  },
  // @ts-expect-error: Custom render function doesn't use args
  args: {},
};

/**
 * A caller blocking on something other than a form supplies its own
 * wording. The admin media card blocks on a video still going up,
 * where "unsaved changes" would send the admin looking for a save
 * button that does not exist.
 */
export const CustomMessage: Story = {
  render: () => {
    const [isBlocked, setIsBlocked] = useState(false);

    const blocker = isBlocked
      ? {
          state: "blocked" as const,
          reset: () => setIsBlocked(false),
          proceed: () => setIsBlocked(false),
          location: mockLocation,
        }
      : {
          state: "unblocked" as const,
          reset: undefined,
          proceed: undefined,
          location: undefined,
        };

    return (
      <div style={{ padding: "2rem" }}>
        <StoryNote>
          The same modal, blocking on an upload in flight rather than an unsaved form.
        </StoryNote>
        <div style={{ width: 300 }}>
          <ActionCardButton label="Leave during upload" onClick={() => setIsBlocked(true)} />
        </div>
        <DirtyFormNavigation
          blocker={blocker}
          message="A video is still uploading. If you leave this page you will not see whether it finishes."
          acceptLabel="Leave anyway"
        />
      </div>
    );
  },
  // @ts-expect-error: Custom render function doesn't use args
  args: {},
};

export const DarkMode: Story = {
  ...Interactive,
  globals: { colorScheme: "dark" },
};
