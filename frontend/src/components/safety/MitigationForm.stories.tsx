/**
 * MitigationForm Storybook Stories
 *
 * No story reaches the network. A page around this form keeps the version
 * it opened and sends it with the save.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";

import { blankMitigation } from "@/lib/safety";
import {
  FLAGGING_MITIGATION,
  SAMPLE_HAZARDS,
  SAMPLE_MITIGATION_OPTIONS,
} from "@/test/safetyFile";

import MitigationForm from "./MitigationForm";

const meta: Meta<typeof MitigationForm> = {
  title: "Safety/Mitigation form",
  component: MitigationForm,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Stack>
        <Story />
        <StoryNote>
          Fictional interface demonstration. No evidence is saved and no clinical approval is
          recorded. A page must keep the opened version and navigation protection around this
          form.
        </StoryNote>
      </Stack>
    ),
  ],
  args: {
    hazards: SAMPLE_HAZARDS,
    options: SAMPLE_MITIGATION_OPTIONS,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MitigationForm>;

/** A new mitigation, recorded from a hazard's page, so that hazard is already linked. */
export const NewMitigation: Story = {
  args: { initial: blankMitigation("cso@riverbank.example.nhs.uk", ["HAZ-001"]) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(canvas.getByRole("combobox", { name: "Control type" })).toHaveValue("");
    await userEvent.click(canvas.getByRole("button", { name: "Save mitigation" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Mitigation title" }),
      "Fictional daily safety-netting report",
    );
    await userEvent.click(canvas.getByRole("combobox", { name: "Control type" }));
    await userEvent.click(await body.findByRole("option", { name: "Procedural" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save mitigation" }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ control_type: "procedural", hazards: ["HAZ-001"] }),
    );
  },
};

export const Editing: Story = {
  args: { initial: FLAGGING_MITIGATION },
};

/** An implemented control needs its evidence before it saves. */
export const EvidenceMissing: Story = {
  args: { initial: { ...FLAGGING_MITIGATION, evidence: "" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save mitigation" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole("alert", { name: "Mitigation validation problems" }),
    ).toHaveTextContent("needs implementation and verification evidence");
  },
};

/** The server's message for one field shows under that field. */
export const ServerFieldError: Story = {
  args: {
    initial: FLAGGING_MITIGATION,
    fieldErrors: { owner: "Enter a valid email address." },
  },
};

/** A record holding a status this version of Turva does not know opens read only. */
export const UnsupportedRecord: Story = {
  args: { initial: { ...FLAGGING_MITIGATION, status: "under review" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Read-only mitigation");
    await expect(canvas.queryByRole("button", { name: "Save mitigation" })).toBeNull();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ReadOnlyDraft: Story = {
  args: { initial: FLAGGING_MITIGATION, readOnly: true },
};

export const Saving: Story = {
  args: { initial: FLAGGING_MITIGATION, saving: true },
};

export const DarkMode: Story = {
  args: { initial: FLAGGING_MITIGATION },
  globals: { colorScheme: "dark" },
};
