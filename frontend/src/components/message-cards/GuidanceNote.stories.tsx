/**
 * GuidanceNote Component Stories
 *
 * Standing guidance, quieter than `StateMessage`: a plain card with a thin
 * stripe in its status colour down the left edge.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconAlertTriangle } from "@/components/icons/appIcons";
import GuidanceNote from "./GuidanceNote";

const meta: Meta<typeof GuidanceNote> = {
  title: "Message cards/Guidance note",
  component: GuidanceNote,
  parameters: { layout: "padded" },
  args: {
    icon: <IconAlertTriangle />,
    colour: "warning",
    title: "Appointment is not professional verification",
    description:
      "Check competence through your organisation's own governance. Turva requires the person's verified email and profile declaration, but does not check the public register.",
  },
};

export default meta;

type Story = StoryObj<typeof GuidanceNote>;

/** A caution that is always on the page, as on an organisation's page. */
export const Warning: Story = {};
