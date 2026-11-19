/**
 * Not yet in Turva's API: sign-off.
 *
 * SignOffPanel Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { aheadOfTheApi } from "@/stories/aheadOfTheApi";
import { expect, fn, userEvent, within } from "storybook/test";
import SignOffPanel from "./SignOffPanel";
import { SAMPLE_EXTRAS, SAMPLE_EXTRAS_FOR_CSO, SAMPLE_HEAD } from "@/test/safetyFile";

const meta: Meta<typeof SignOffPanel> = {
  decorators: [aheadOfTheApi("formal sign-off (deferred from the funded build)")],
  title: "Safety/Sign-off panel",
  component: SignOffPanel,
  parameters: { layout: "padded" },
  args: { file: SAMPLE_EXTRAS_FOR_CSO, head: SAMPLE_HEAD, onSign: fn() },
};

export default meta;
type Story = StoryObj<typeof SignOffPanel>;

export const ForTheCso: Story = {};

export const Confirmation: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Approve the safety case" }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole("dialog", {
      name: "Approve the safety case",
    });
    await expect(dialog).toHaveTextContent(SAMPLE_HEAD);
    await expect(dialog).toHaveTextContent("does not sign or tag evidence");
    await userEvent.type(within(dialog).getByLabelText("Authenticator code"), "123456");
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await expect(args.onSign).toHaveBeenCalledTimes(1);
    await expect(args.onSign).toHaveBeenLastCalledWith("approved", "123456", SAMPLE_HEAD);
  },
};

export const MissingSourceVersion: Story = {
  args: { head: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Source version unavailable");
    await expect(canvas.queryByRole("button", { name: "Approve the safety case" })).toBeNull();
  },
};

export const CompleteReportedReferences: Story = {
  args: {
    file: {
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "approved",
      sign_offs: {
        ...SAMPLE_EXTRAS_FOR_CSO.sign_offs!,
        can_approve: false,
        tags: ["approved/2026-2-01", "approved/2026-11-07"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("approved/2026-2-01", { exact: true })).toBeVisible();
    await expect(canvas.getByText("approved/2026-11-07", { exact: true })).toBeVisible();
    await expect(
      canvas.queryByText(/Signed for the file as it stands|Last signed as/),
    ).toBeNull();
  },
};

export const Approved: Story = {
  args: {
    file: {
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "approved",
      sign_offs: {
        can_approve: false,
        can_accept: false,
        two_factor_enabled: true,
        tags: ["approved/2026-11-07"],
      },
    },
  },
};

export const NoTwoFactor: Story = {
  args: {
    file: {
      ...SAMPLE_EXTRAS_FOR_CSO,
      sign_offs: {
        can_approve: true,
        can_accept: false,
        two_factor_enabled: false,
        tags: [],
      },
    },
  },
};

export const ForAReader: Story = {
  args: { file: { ...SAMPLE_EXTRAS, sign_offs: null } },
};

export const DarkMode: Story = {
  globals: { colorScheme: "dark" },
};
