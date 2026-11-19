/**
 * Not yet in Turva's API: the file's prose documents and its status.
 *
 * SafetyDocumentSheet Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import SafetyDocumentSheet from "./SafetyDocumentSheet";

const TEXT = `# Clinical Safety Case Report

## 1. System

**BP@Home remote blood pressure monitoring**, deployed by Riverbank Health
Federation.

## 2. Clinical Safety Officer

|                           |                                  |
| ------------------------- | -------------------------------- |
| Name                      | Dr Anita Patel                   |
| Professional registration | GMC 7654321                      |
| Contact                   | a.patel@riverbank.example.nhs.uk |

## 5. Residual risk

Six hazards were identified. Four have been reduced to a derived residual
risk level of 2.
`;

const meta: Meta<typeof SafetyDocumentSheet> = {
  decorators: [aheadOfTheApi("the file's prose documents and its status")],
  title: "Safety/Safety document sheet",
  component: SafetyDocumentSheet,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SafetyDocumentSheet>;

export const Draft: Story = {
  args: {
    system: "BP@Home remote blood pressure monitoring",
    status: "draft",
    commit: "a".repeat(40),
    text: TEXT,
  },
};

export const Accepted: Story = {
  args: { ...Draft.args, status: "accepted" },
};

export const DarkMode: Story = {
  ...Draft,
  globals: { colorScheme: "dark" },
};

export const NarrowDocument: Story = {
  ...Draft,
  render: (args) => (
    <div style={{ maxWidth: 358 }}>
      <SafetyDocumentSheet {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByTestId("safety-document-sheet");
    const table = canvas.getByRole("table");
    await expect(table.getBoundingClientRect().right).toBeLessThanOrEqual(
      sheet.getBoundingClientRect().right,
    );
    await expect(
      canvas.getByRole("link", { name: "a.patel@riverbank.example.nhs.uk" }),
    ).toHaveAttribute("href", "mailto:a.patel@riverbank.example.nhs.uk");
  },
};

export const MissingSourceVersion: Story = {
  args: { ...Accepted.args, commit: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("alert", { name: "Source version unavailable" }),
    ).toBeVisible();
  },
};

export const RecordedQualification: Story = {
  args: {
    ...Draft.args,
    text: "# Fictional report\n\nBefore <!-- evidence has not been independently reviewed --> after.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/evidence has not been independently reviewed/),
    ).toBeVisible();
    await expect(canvas.getByText(`As at commit ${"a".repeat(40)}`)).toBeVisible();
  },
};
