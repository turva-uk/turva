/**
 * MarkdownEditor Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MarkdownEditor from "./MarkdownEditor";

const TEXT = `## 5. Residual risk

Six hazards were identified. Four have been reduced to a derived residual
risk level of 2. Two remain at level 3:

- **HAZ-003**, inaccurate readings from an unsuitable monitor
- **HAZ-004**, patients unable to use the service
`;

const meta: Meta<typeof MarkdownEditor> = {
  title: "Forms/Markdown editor",
  component: MarkdownEditor,
  parameters: { layout: "padded" },
  args: { label: "Residual risk statement", value: TEXT, onChange: fn() },
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

export const Default: Story = {};

export const Empty: Story = { args: { value: "" } };

export const ReadOnly: Story = { args: { readOnly: true } };

/** A table, and a note left as an HTML comment, as a safety file's template has. */
const SIGN_OFF = `## 6. Conclusion and sign-off

<!-- This section is completed by the Clinical Safety Officer at approval. -->

|                           |                |
| ------------------------- | -------------- |
| Clinical Safety Officer   | Dr Anita Patel |
| Professional registration | GMC 7654321    |
`;

export const TableAndNote: Story = {
  args: { label: "Clinical safety case report", value: SIGN_OFF },
};

/**
 * A document longer than the screen: scroll down, and the toolbar stays
 * at the top while the editor is in view.
 */
export const LongDocument: Story = {
  args: {
    label: "Clinical safety case report",
    value: Array.from({ length: 12 }, () => TEXT).join("\n") + SIGN_OFF,
  },
};

export const DarkMode: Story = { globals: { colorScheme: "dark" } };

export const TableAndNoteDarkMode: Story = {
  ...TableAndNote,
  globals: { colorScheme: "dark" },
};
