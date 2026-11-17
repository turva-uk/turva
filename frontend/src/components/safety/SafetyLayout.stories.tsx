/**
 * Safety Page Layout Stories
 *
 * The safety components put together as each safety page would lay them
 * out: a `PageHeader`, the file the page belongs to, then its content.
 * The pages themselves cannot be stories, since each reads its file from
 * the API, so these use the sample file in the shape the API serves.
 *
 * Quill wrapped these in its `MainLayout`, with its ribbon, navigation
 * and inbox, which Turva does not have. Each story here is the page's
 * content on its own, in a plain `Stack`.
 *
 * The overview, documents and officers show features not yet in Turva's
 * API, and those stories say so.
 */

import { SimpleGrid, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { fn } from "storybook/test";

import ActionCard from "@/components/action-card";
import {
  IconAlertTriangle,
  IconFileText,
  IconShieldCheck,
  IconUser,
} from "@/components/icons/appIcons";
import PageHeader from "@/components/page-header";
import { BodyText } from "@/components/typography";
import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import {
  BLOCKING_HAZARD,
  SAMPLE_EXTRAS,
  SAMPLE_FILE_DETAIL,
  SAMPLE_HAZARD_OPTIONS,
  SAMPLE_HAZARDS,
  SAMPLE_HEAD,
  SAMPLE_MITIGATIONS,
} from "@/test/safetyFile";

import DocumentTable from "./DocumentTable";
import HazardDetail from "./HazardDetail";
import HazardTable from "./HazardTable";
import OfficerList from "./OfficerList";
import SafetyDocumentSheet from "./SafetyDocumentSheet";
import SafetyStatusBadge from "./SafetyStatusBadge";

const file = SAMPLE_FILE_DETAIL.safety_file;

const meta: Meta = {
  title: "Safety/Page layout",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** One safety page: its header, the file it belongs to, then its content */
function SafetyPage({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack gap="lg">
      <PageHeader title={title} action={action} actionAlign="center" />
      <BodyText c="dimmed">{file.name}</BodyText>
      {children}
    </Stack>
  );
}

const fileSections = [
  {
    icon: <IconFileText />,
    title: "Documentation",
    subtitle: `${SAMPLE_EXTRAS.documents.length} documents in the file.`,
    label: "Open documentation",
  },
  {
    icon: <IconAlertTriangle />,
    title: "Hazards",
    subtitle: `${SAMPLE_HAZARDS.length} hazards, ${SAMPLE_FILE_DETAIL.blocking?.length ?? 0} blocking go-live.`,
    label: "Open hazard log",
  },
  {
    icon: <IconUser />,
    title: "Officers",
    subtitle: "Clinical Safety Officer: Dr Anita Patel.",
    label: "Open officers",
  },
  {
    icon: <IconShieldCheck />,
    title: "Sign-off",
    subtitle: "Not yet approved.",
    label: "Open sign-off",
  },
];

/** The file page: its name and status, then a card for each part. */
export const FileOverview: Story = {
  decorators: [aheadOfTheApi("a file's status, documents, officers and sign-off")],
  render: () => (
    <Stack gap="lg">
      <PageHeader
        title={file.name}
        action={<SafetyStatusBadge status={SAMPLE_EXTRAS.status} />}
        actionAlign="center"
      />
      <BodyText c="dimmed">
        {file.organisation}, assessed against {file.standard}.
      </BodyText>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {fileSections.map((section) => (
          <ActionCard
            key={section.title}
            icon={section.icon}
            title={section.title}
            subtitle={section.subtitle}
            buttonLabel={section.label}
            onClick={fn()}
          />
        ))}
      </SimpleGrid>
    </Stack>
  ),
};

/** The hazard log, each hazard with the levels the server derived. */
export const HazardLog: Story = {
  render: () => (
    <SafetyPage title="Hazards">
      <HazardTable hazards={SAMPLE_HAZARDS} onSelect={fn()} />
    </SafetyPage>
  ),
};

/** A hazard whose residual level blocks go-live. */
export const HazardDetails: Story = {
  name: "Hazard detail",
  render: () => (
    <SafetyPage title={BLOCKING_HAZARD.id}>
      <HazardDetail
        hazard={BLOCKING_HAZARD}
        mitigations={SAMPLE_MITIGATIONS}
        options={SAMPLE_HAZARD_OPTIONS}
      />
    </SafetyPage>
  ),
};

/** The documents the file holds. */
export const Documentation: Story = {
  decorators: [aheadOfTheApi("the file's prose documents")],
  render: () => (
    <SafetyPage title="Documentation">
      <DocumentTable documents={SAMPLE_EXTRAS.documents} onSelect={fn()} />
    </SafetyPage>
  ),
};

/** One document, as its page shows it. */
export const Document: Story = {
  decorators: [aheadOfTheApi("the file's prose documents and its status")],
  render: () => (
    <SafetyPage title="Clinical Safety Case Report">
      <SafetyDocumentSheet
        system={file.name}
        status={SAMPLE_EXTRAS.status}
        commit={SAMPLE_HEAD}
        text={"# Clinical Safety Case Report\n\n## 1. System\n\nBP@Home."}
      />
    </SafetyPage>
  ),
};

/** The two posts in the file's organisation. */
export const Officers: Story = {
  decorators: [aheadOfTheApi("the safety posts in the file's organisation")],
  render: () => (
    <SafetyPage title="Officers">
      <OfficerList posts={SAMPLE_EXTRAS.posts} />
    </SafetyPage>
  ),
};

/** The file page in dark mode. */
export const DarkMode: Story = {
  ...FileOverview,
  globals: { colorScheme: "dark" },
};
