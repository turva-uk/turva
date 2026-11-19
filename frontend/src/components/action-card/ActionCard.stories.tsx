/**
 * ActionCard Component Stories
 *
 * Demonstrates the ActionCard component with various icons and configurations.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import ActionCard from "./ActionCard";
import {
  IconDownload,
  IconFileText,
  IconShieldCheck,
  IconUser,
  IconUserPlus,
} from "@/components/icons/appIcons";
import { SimpleGrid } from "@mantine/core";

const meta = {
  title: "Action card/Action card",
  component: ActionCard,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    icon: {
      control: false,
      description: "Icon element from @tabler/icons-react",
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default ActionCard
 *
 * Basic action card with icon, title, subtitle, and button.
 * Icons default to "lg" size (48px desktop, 32px mobile).
 */
export const Default: Story = {
  args: {
    icon: <IconUserPlus />,
    title: "Add User",
    subtitle: "Invite a colleague to the organisation",
    buttonLabel: "Add New User",
    buttonUrl: "/admin/users/new",
  },
};

/**
 * Destructive: the button is red, for an action that takes something
 * away, as the edit site page's "Deactivate site" card is.
 */
export const Destructive: Story = {
  args: {
    icon: <IconUserPlus />,
    title: "Deactivate site",
    subtitle:
      "Stop this site taking part. It takes no more registrations and nobody can be added to it. Results are kept.",
    buttonLabel: "Deactivate site",
    buttonDestructive: true,
    onClick: () => undefined,
  },
};

/**
 * Disabled, with the reason
 *
 * A button greyed out with nothing said reads as broken, so the reason
 * sits beneath it, as on a user's page where the viewer may not
 * deactivate the account.
 */
export const DisabledWithReason: Story = {
  args: {
    icon: <IconUserPlus />,
    title: "Deactivate user",
    subtitle: "Disable this user account",
    buttonLabel: "Deactivate",
    onClick: () => undefined,
    disabled: true,
    disabledReason:
      "Only an organisation administrator can manage this account. Organisation administration does not grant access to its safety evidence.",
  },
};

/**
 * Without subtitle
 *
 * The title and the action say enough without another explanatory line.
 */
export const WithoutSubtitle: Story = {
  args: {
    icon: <IconUserPlus />,
    title: "Add User",
    buttonLabel: "Add New User",
    buttonUrl: "/admin/users/new",
  },
};

/**
 * Long Content
 *
 * ActionCard with longer title and subtitle text.
 */
export const LongContent: Story = {
  args: {
    icon: <IconUserPlus />,
    title: "Add User Account with Extended Permissions",
    subtitle:
      "Invite a colleague to your organisation. Reading or editing private evidence also requires a current CSO appointment and a named file-team grant.",
    buttonLabel: "Create New User Account",
    buttonUrl: "/admin/users/new",
  },
};

/**
 * Full width
 *
 * ActionCard without max-width, filling the available container width.
 * Useful for standalone call-to-action sections like certificate downloads.
 */
export const FullWidth: Story = {
  args: {
    title: "Certificate",
    subtitle:
      "You have passed this assessment. Download your certificate below as a PDF to keep for your records.",
    buttonLabel: "Download certificate",
    fullWidth: true,
    buttonVariant: "filled",
  },
};

/**
 * Safety file page
 *
 * Action cards as a safety file's page might show them, arranged in a
 * responsive 2-column grid.
 */
export const SafetyFilePage: Story = {
  args: {
    icon: <IconFileText />,
    title: "Hazard log",
    subtitle: "Every hazard in this safety file, with its risk before and after mitigation",
    buttonLabel: "View hazards",
    buttonUrl: "/safety-files/discharge-summary/hazards",
  },
  render: () => (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      <ActionCard
        icon={<IconFileText />}
        title="Hazard log"
        subtitle="Every hazard in this safety file, with its risk before and after mitigation"
        buttonLabel="View hazards"
        buttonUrl="/safety-files/discharge-summary/hazards"
      />
      <ActionCard
        icon={<IconShieldCheck />}
        title="Mitigations"
        subtitle="The controls that reduce each hazard's risk"
        buttonLabel="View mitigations"
        buttonUrl="/safety-files/discharge-summary/mitigations"
      />
      <ActionCard
        icon={<IconUser />}
        title="Team"
        subtitle="Who can read and edit this safety file"
        buttonLabel="View team"
        buttonUrl="/safety-files/discharge-summary/team"
      />
      <ActionCard
        icon={<IconDownload />}
        title="Export"
        subtitle="Download the safety case report as a PDF"
        buttonLabel="Download report"
        buttonUrl="/safety-files/discharge-summary/export"
      />
    </SimpleGrid>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
