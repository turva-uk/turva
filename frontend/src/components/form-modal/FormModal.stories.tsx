/**
 * FormModal Component Stories
 *
 * A short form in a modal: filling it in, a full success, a partial
 * success and a failure. The send is a stub, so nothing leaves the page.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { EMAIL_PATTERN, EmailField } from "@/components/form";
import { useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import FormModal from "./FormModal";

type Values = { email: string };

function Fields() {
  const { methods } = useFormContext<Values>();

  return (
    <EmailField
      label="Invitee's email address"
      required
      data-autofocus
      {...methods.register("email", {
        required: "Enter the invitee's email address",
        pattern: EMAIL_PATTERN,
      })}
      error={methods.formState.errors.email?.message}
    />
  );
}

function answering(result: FormSubmitResult<Values>) {
  return async () => result;
}

function Invite({
  onSubmit,
}: {
  onSubmit: (data: Values) => Promise<FormSubmitResult<Values>>;
}) {
  return (
    <FormModal<Values>
      opened
      onClose={fn()}
      title="Invite a member"
      intro="An invitation grants membership only after the recipient accepts using the same verified email address. It does not appoint a CSO or share a safety file."
      defaultValues={{ email: "" }}
      onSubmit={onSubmit}
      submitLabel="Send membership invitation"
    >
      <Fields />
    </FormModal>
  );
}

const meta: Meta<typeof Invite> = {
  title: "Modals/Form modal",
  component: Invite,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof Invite>;

async function send() {
  const body = within(document.body);

  await userEvent.type(
    await body.findByRole("textbox", { name: /Invitee's email address/ }),
    "s.whitlock@riverbank.example.nhs.uk",
  );
  await userEvent.click(body.getByRole("button", { name: "Send membership invitation" }));

  return body;
}

/** The form, as it opens. */
export const Default: Story = {
  args: { onSubmit: answering({ state: "success", message: { title: "Invitation sent" } }) },
};

/** Sent: the form gives way to the result and a Close button. */
export const Sent: Story = {
  args: {
    onSubmit: answering({
      state: "success",
      message: { title: "Invitation sent", description: "It expires in seven days." },
    }),
  },
  play: async () => {
    const body = await send();

    await expect(await body.findByText("Invitation sent")).toBeVisible();
    await expect(body.getByRole("button", { name: "Close" })).toBeVisible();
  },
};

/** A partial success shows amber, with its explanation. */
export const PartlySent: Story = {
  args: {
    onSubmit: answering({
      state: "partial_success",
      message: {
        title: "Invitation recorded, email not sent",
        description:
          "The invitation was recorded, but its email could not be sent. Check mail delivery and try again after ten minutes.",
      },
    }),
  },
  play: async () => {
    const body = await send();

    await expect(await body.findByText("Invitation recorded, email not sent")).toBeVisible();
  },
};

/** A failure stays on the form, with the draft kept. */
export const NotSent: Story = {
  args: {
    onSubmit: answering({
      state: "error",
      message: {
        title: "Could not invite this member",
        description: "That address is already an active member of this organisation.",
      },
    }),
  },
  play: async () => {
    const body = await send();

    await expect(await body.findByRole("alert")).toHaveTextContent(
      "Could not invite this member.",
    );
    await expect(body.getByRole("textbox", { name: /Invitee's email address/ })).toHaveValue(
      "s.whitlock@riverbank.example.nhs.uk",
    );
  },
};
