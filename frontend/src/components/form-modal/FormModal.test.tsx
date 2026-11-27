/**
 * FormModal Component Tests
 *
 * The modal is named by its title, sends the form, shows a success or a
 * partial success as its result, keeps a failure on the form, and cannot
 * be closed while a send is under way.
 */

import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { badgeColours } from "@/components/badge/badgeColours";
import { TextField } from "@/components/form";
import { useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import { renderWithMantine } from "@/test/test-utils";
import FormModal from "./FormModal";

type Values = { email: string };

function Fields() {
  const { methods } = useFormContext<Values>();

  return <TextField label="Email address" {...methods.register("email")} />;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function renderModal(
  onSubmit: (data: Values) => Promise<FormSubmitResult<Values>>,
  onClose = vi.fn(),
) {
  renderWithMantine(
    <FormModal<Values>
      opened
      onClose={onClose}
      title="Invite a member"
      intro="An invitation grants membership only."
      defaultValues={{ email: "" }}
      onSubmit={onSubmit}
      submitLabel="Send invitation"
    >
      <Fields />
    </FormModal>,
  );

  return { onClose };
}

async function send(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Email address" }), "a@example.org");
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
}

describe("FormModal", () => {
  it("is a dialog named by its title, with the intro and the fields", () => {
    renderModal(vi.fn());

    expect(screen.getByRole("dialog", { name: "Invite a member" })).toBeInTheDocument();
    expect(screen.getByText("An invitation grants membership only.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
  });

  it("sends the values, then shows the result and a Close button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (): Promise<FormSubmitResult<Values>> => ({
      state: "success",
      message: { title: "Invitation sent", description: "It expires in seven days." },
    }));
    const { onClose } = renderModal(onSubmit);

    await send(user);

    expect(onSubmit).toHaveBeenCalledWith({ email: "a@example.org" });
    expect(await screen.findByText("Invitation sent")).toBeInTheDocument();
    expect(screen.getByText("It expires in seven days.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email address" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows a partial success as a warning, not a plain success", async () => {
    const user = userEvent.setup();
    renderModal(async () => ({
      state: "partial_success",
      message: { title: "Invitation recorded, email not sent" },
    }));

    await send(user);

    expect(await screen.findByText("Invitation recorded, email not sent")).toBeInTheDocument();
    expect(screen.getByTestId("result-message").getAttribute("style") ?? "").toContain(
      badgeColours.warning.bg,
    );
  });

  it("keeps a failure on the form, with the draft", async () => {
    const user = userEvent.setup();
    renderModal(async () => ({
      state: "error",
      message: { title: "Could not invite this member" },
    }));

    await send(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not invite this member.");
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue("a@example.org");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("cannot be closed by Cancel or Escape while a send is under way", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult<Values>>();
    const { onClose } = renderModal(() => pending.promise);

    await send(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ state: "success", message: { title: "Sent" } }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing while closed", () => {
    renderWithMantine(
      <FormModal<Values>
        opened={false}
        onClose={vi.fn()}
        title="Invite a member"
        defaultValues={{ email: "" }}
        onSubmit={vi.fn()}
        submitLabel="Send invitation"
      >
        <Fields />
      </FormModal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
