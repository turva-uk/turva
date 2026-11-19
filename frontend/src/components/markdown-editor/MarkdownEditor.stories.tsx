/**
 * MarkdownEditor Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";
import { Button, Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import MarkdownEditor from "./MarkdownEditor";
import type { MarkdownEditorProps } from "./MarkdownEditor";

const TEXT = `## 5. Residual risk

Fictional draft for interface testing. Assessment and clinical review are
still required for these example hazards:

- **HAZ-003**, inaccurate readings from an unsuitable monitor
- **HAZ-004**, patients unable to use the service
`;

const meta: Meta<typeof MarkdownEditor> = {
  title: "Forms/Markdown editor",
  component: MarkdownEditor,
  parameters: { layout: "padded" },
  args: { label: "Residual risk statement", value: TEXT, onChange: fn() },
  decorators: [
    (Story) => (
      <Stack>
        <Story />
        <StoryNote>
          Fictional editor demonstration. Editing text does not save evidence or record clinical
          approval.
        </StoryNote>
      </Stack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

export const Default: Story = {};

export const Empty: Story = { args: { value: "" } };

export const LinkedEvidence: Story = {
  args: {
    value: "Read the [supplier evidence](https://blocked.example.test/evidence) before review.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = canvasElement.ownerDocument.location.href;
    await userEvent.click(canvas.getByRole("link", { name: "supplier evidence" }));
    await expect(canvasElement.ownerDocument.location.href).toBe(before);
    await expect(canvas.getByRole("textbox")).toHaveTextContent("supplier evidence");
  },
};

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("textbox", { name: "Clinical safety case report" }),
    ).toHaveAttribute("contenteditable", "true");
    await expect(canvas.getByRole("cell", { name: "Dr Anita Patel" })).toBeVisible();
  },
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

export const UnsupportedEvidence: Story = {
  args: {
    label: "Evidence source",
    value: "Review <!-- >= --> 5 mg.\n\n![Reviewed diagram](evidence/diagram.png)",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Evidence source" });
    await expect(input).toHaveValue(args.value);
    await expect(canvas.getByRole("alert")).toHaveTextContent("source is shown unchanged");
    await userEvent.type(input, "\nReviewed as a fictional example.");
    await expect(args.onChange).toHaveBeenLastCalledWith(
      `${args.value}\nReviewed as a fictional example.`,
    );
    await expect(canvasElement.querySelector("img,iframe,[contenteditable=true]")).toBeNull();
  },
};

function RevocationDemo(args: MarkdownEditorProps) {
  const [value, setValue] = useState(args.value);
  const [readOnly, setReadOnly] = useState(false);
  return (
    <Stack>
      <Button onClick={() => setReadOnly(true)}>Simulate read-only</Button>
      <MarkdownEditor
        {...args}
        value={value}
        readOnly={readOnly}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    </Stack>
  );
}

// user-event's End-key model supports flat contenteditable text only. Use the
// browser's real selection API for ProseMirror's paragraph-based document.
function focusAtEnd(input: HTMLElement) {
  input.focus();
  const range = input.ownerDocument.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  const selection = input.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export const RetainedDraftAndRevocation: Story = {
  args: { label: "Evidence draft", value: "Opened narrative." },
  render: (args) => <RevocationDemo {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Evidence draft" });
    focusAtEnd(input);
    await userEvent.keyboard(" Retained edit.");
    await waitFor(() => expect(input).toHaveTextContent("Retained edit."));
    await waitFor(() =>
      expect(args.onChange).toHaveBeenLastCalledWith(expect.stringContaining("Retained edit.")),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Simulate read-only" }));
    await waitFor(() => expect(input).toHaveAttribute("contenteditable", "false"));
    await expect(input).toHaveAttribute("aria-readonly", "true");
    await expect(canvas.queryByLabelText("Bold")).toBeNull();
    await expect(input).toHaveTextContent("Retained edit.");
    input.focus();
    await userEvent.keyboard(" altered after revocation");
    const clipboard = new DataTransfer();
    clipboard.setData("text/plain", " altered after revocation");
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: clipboard,
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect(input).not.toHaveTextContent("altered after revocation");
  },
};

export const SafeFormattedPaste: Story = {
  args: { label: "Evidence draft", value: "Draft. " },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Evidence draft" });
    focusAtEnd(input);
    const data = new DataTransfer();
    data.setData("text/plain", "Review >= 5 mg. <img src=unapproved>");
    data.setData("text/html", '<img src="https://blocked.example.test/scan.png"><b>Review</b>');
    data.setData("vscode-editor-data", "untrusted metadata is not JSON");
    input.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
    await expect(input).toHaveTextContent("Review >= 5 mg. <img src=unapproved>");
    await expect(canvasElement.querySelector("img,iframe")).toBeNull();
    await expect(canvas.getByRole("status")).toHaveTextContent("Pasted as plain text");
    await expect(args.onChange).toHaveBeenLastCalledWith(expect.stringContaining("5 mg"));
  },
};
