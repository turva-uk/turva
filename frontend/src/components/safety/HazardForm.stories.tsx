/**
 * HazardForm Storybook Stories
 *
 * Every story passes `samplePreview` as `previewAssessment`, so none
 * reaches the network: the levels shown are the ones Turva's matrix
 * gives, from the sample data.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";
import { Button, Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";

import { blankHazard, hazardInputFrom, type Assessment } from "@/lib/safety";
import { MITIGATED_HAZARD, SAMPLE_HAZARD_OPTIONS, samplePreview } from "@/test/safetyFile";

import HazardForm from "./HazardForm";
import type { HazardFormProps } from "./HazardForm";

const meta: Meta<typeof HazardForm> = {
  title: "Safety/Hazard form",
  component: HazardForm,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Stack>
        <Story />
        <StoryNote>
          Fictional interface demonstration. No evidence is saved and no clinical approval is
          recorded. A page must keep the opened version, pending state and navigation protection
          around this form.
        </StoryNote>
      </Stack>
    ),
  ],
  args: {
    options: SAMPLE_HAZARD_OPTIONS,
    previewAssessment: samplePreview,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HazardForm>;

export const NewHazard: Story = {
  args: { initial: blankHazard("cso@riverbank.example.nhs.uk") },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("combobox", { name: /^Severity/ })[0]).toHaveValue("");
    await expect(canvas.queryByRole("img", { name: /^Risk level/ })).toBeNull();
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Hazard" }),
      "Fictional deliberate assessment",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save hazard" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    for (const name of ["Initial risk", "Residual risk"]) {
      const group = within(canvas.getByRole("group", { name }));
      await userEvent.click(group.getByRole("combobox", { name: /^Severity/ }));
      await userEvent.click(
        await within(canvasElement.ownerDocument.body).findByRole("option", {
          name: "4 - Major",
        }),
      );
      await userEvent.click(group.getByRole("combobox", { name: /^Likelihood/ }));
      await userEvent.click(
        await within(canvasElement.ownerDocument.body).findByRole("option", {
          name: "1 - Very low",
        }),
      );
    }
    await userEvent.type(canvas.getByRole("textbox", { name: "Hazard" }), "{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initial: { severity: 4, likelihood: 1 },
        residual: { severity: 4, likelihood: 1 },
      }),
    );
  },
};

/** Untouched draft for inspecting unchosen clinical scores at each viewport. */
export const UnassessedDraft: Story = {
  args: { initial: blankHazard("cso@riverbank.example.nhs.uk") },
};

export const Editing: Story = {
  args: { initial: hazardInputFrom(MITIGATED_HAZARD) },
};

export const SaveFailed: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    error: "Somebody else saved this file after you opened it.",
  },
};

/** The server could not be asked for the level. */
export const PreviewFailed: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    previewAssessment: () => Promise.reject(new Error("offline")),
  },
};

export const Saving: Story = {
  args: { initial: MITIGATED_HAZARD, saving: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Hazard" }), "{Enter}");
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

/** Waiting for the server's answer: no level is shown until it comes. */
export const WorkingOutTheLevel: Story = {
  args: {
    initial: hazardInputFrom(MITIGATED_HAZARD),
    previewAssessment: () => new Promise<Assessment>(() => {}),
  },
};

export const DarkMode: Story = {
  ...Editing,
  globals: { colorScheme: "dark" },
};

export const UnsupportedRecord: Story = {
  args: {
    initial: { ...MITIGATED_HAZARD, status: "under review", body: "Before <!-- >= --> after." },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert", { name: "Read-only hazard" })).toHaveTextContent(
      "Read-only hazard",
    );
    await expect(canvas.getByRole("textbox", { name: "Recorded status" })).toHaveValue(
      "under review",
    );
    await expect(canvas.getByRole("textbox", { name: "Notes" })).toHaveValue(
      "Before <!-- >= --> after.",
    );
    await expect(canvas.queryByRole("button", { name: "Save hazard" })).toBeNull();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

function RevocationDemo(args: HazardFormProps) {
  const [readOnly, setReadOnly] = useState(false);
  return (
    <Stack>
      <Button onClick={() => setReadOnly(true)}>Simulate read-only access</Button>
      <HazardForm {...args} readOnly={readOnly} />
    </Stack>
  );
}

export const RetainedDraftAfterRevocation: Story = {
  args: { initial: { ...MITIGATED_HAZARD, body: "Before <!-- inline --> after." } },
  render: (args) => <RevocationDemo {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByRole("textbox", { name: "Hazard" });
    await userEvent.type(title, " retained draft");
    await userEvent.click(canvas.getByRole("button", { name: "Simulate read-only access" }));
    await waitFor(() => expect(title).toHaveAttribute("readonly"));
    await userEvent.type(title, " unwanted change");
    await expect(title).toHaveValue(`${MITIGATED_HAZARD.title} retained draft`);
    await expect(canvas.getByRole("textbox", { name: "Notes" })).toHaveAttribute("readonly");
    const severity = within(canvas.getByRole("group", { name: "Initial risk" })).getByRole(
      "combobox",
      { name: /^Severity/ },
    );
    const recordedSeverity = severity.getAttribute("value");
    await userEvent.click(severity);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(severity).toHaveAttribute("aria-readonly", "true");
    await expect(severity).toHaveAttribute("aria-expanded", "false");
    await expect(severity).toHaveValue(recordedSeverity);
    await expect(within(canvasElement.ownerDocument.body).queryByRole("listbox")).toBeNull();
    const status = canvas.getByRole("combobox", { name: "Status" });
    await userEvent.click(status);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(status).toHaveValue("Open");
    await expect(status).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(canvas.getByRole("button", { name: "Save hazard" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const MismatchedPreview: Story = {
  args: { initial: MITIGATED_HAZARD, previewAssessment: () => samplePreview(1, 1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getAllByText(/could not work out the risk level/)).toHaveLength(2),
    );
    await expect(canvas.queryByRole("img", { name: /^Risk level/ })).toBeNull();
  },
};
