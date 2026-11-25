/**
 * FormModal Component
 *
 * A short form in a modal, opened from a page without leaving it, such as
 * "Invite a member" from an organisation's invitations table. The person
 * fills it in and sends it; once it has arrived the form gives way to the
 * result and a Close button, so they see it worked before the modal goes.
 *
 * - **A full success** shows a green result.
 * - **A partial success**, such as an invitation recorded but its email not
 *   sent, shows an amber result with its explanation, so it is never
 *   mistaken for a plain success.
 * - **A failure** stays on the form, with the message above the buttons and
 *   the draft kept, so the person can correct it and send again.
 *
 * The modal cannot be closed while a send is under way: not by Cancel,
 * Escape or anything else. The server may still be writing, and closing
 * would let the same thing be sent twice. A click outside never closes it,
 * so a typed draft is not lost by accident.
 *
 * Sending is the caller's `onSubmit`, so the modal knows nothing of the
 * network: the page passes its request, stories and tests pass a stub.
 *
 * @example
 * ```tsx
 * <FormModal<InviteValues>
 *   opened={opened}
 *   onClose={() => setOpened(false)}
 *   title="Invite a member"
 *   intro="An invitation grants membership only."
 *   defaultValues={{ email: "" }}
 *   onSubmit={invite}
 *   submitLabel="Send membership invitation"
 *   submittingLabel="Sending…"
 * >
 *   <InviteFields />
 * </FormModal>
 * ```
 */

import { Modal, Stack } from "@mantine/core";
import { useState, type ReactNode } from "react";
import type { DefaultValues, FieldValues } from "react-hook-form";

import ButtonPair from "@/components/button/ButtonPair";
import { Form, FormStatusNarrow, SubmitButton } from "@/components/form/Form";
import type { FormStatusMessage, FormSubmitResult } from "@/components/form/Form";
import ResultMessage from "@/components/message-cards/ResultMessage";
import { BodyText, Heading } from "@/components/typography";

export interface FormModalProps<T extends FieldValues> {
  /** Whether the modal is open */
  opened: boolean;
  /** Called on Cancel, Close or Escape, never while a send is under way */
  onClose: () => void;
  /** The modal's heading, which also names the dialog */
  title: string;
  /** A sentence or two above the fields */
  intro?: ReactNode;
  /** The form's starting values */
  defaultValues: DefaultValues<T>;
  /** Sends the form, and says how it went */
  onSubmit: (data: T) => Promise<FormSubmitResult<T>>;
  /** The send button's label */
  submitLabel: string;
  /** The send button's label while sending (defaults to "Sending…") */
  submittingLabel?: string;
  /** The fields, which reach the form through `useFormContext` */
  children: ReactNode;
}

type Outcome = { variant: "success" | "warning"; message: FormStatusMessage };

export default function FormModal<T extends FieldValues>({
  opened,
  onClose,
  title,
  intro,
  defaultValues,
  onSubmit,
  submitLabel,
  submittingLabel = "Sending…",
  children,
}: FormModalProps<T>) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState(false);

  function close() {
    if (sending) return;

    setOutcome(null);
    onClose();
  }

  async function submit(data: T): Promise<FormSubmitResult<T>> {
    setSending(true);

    try {
      const result = await onSubmit(data);

      if (result.state === "success") {
        setOutcome({ variant: "success", message: result.message });
      } else if (result.state === "partial_success") {
        setOutcome({ variant: "warning", message: result.message });
      }

      return result;
    } finally {
      setSending(false);
    }
  }

  // Closed, it renders nothing, so the next opening starts a fresh form.
  if (!opened) return null;

  return (
    <Modal
      opened={opened}
      onClose={close}
      closeOnClickOutside={false}
      closeOnEscape={!sending}
      withCloseButton={false}
      centered
      size="lg"
    >
      <Stack gap="md" py="md">
        {/*
          Mantine's modal title, so the dialog is named by it, drawn as a
          plain wrapper round our own heading, which stays the h2.
        */}
        <Modal.Title renderRoot={(props) => <div {...props} />}>
          <Heading>{title}</Heading>
        </Modal.Title>

        {outcome ? (
          <>
            <ResultMessage variant={outcome.variant} title={outcome.message.title} />
            {outcome.message.description && <BodyText>{outcome.message.description}</BodyText>}
            <ButtonPair acceptLabel="Close" onAccept={close} />
          </>
        ) : (
          <>
            {intro && <BodyText>{intro}</BodyText>}
            <Form<T>
              defaultValues={defaultValues}
              onSubmit={submit}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
              blockNavigation={false}
            >
              <Stack gap="md">
                {children}
                <FormStatusNarrow retainsDraft />
                <SubmitButton onCancel={close} />
              </Stack>
            </Form>
          </>
        )}
      </Stack>
    </Modal>
  );
}
