import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BrowserRouter,
  createMemoryRouter,
  Link,
  RouterProvider,
  useNavigate,
} from "react-router";
import { useFormState } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import { Form, FormStatus, SubmitButton, useFormContext } from "./Form";
import type { FormProps, FormSubmitResult } from "./Form/Form";
import TextField from "./TextField";
import DateField from "./DateField";
import SolidSwitch from "./SolidSwitch";
import RadioField from "./RadioField";
import { parseDateInput } from "./parseDateInput";
import PasswordConfirmModal from "@/components/confirm-modal/PasswordConfirmModal";
import CodeConfirmModal from "@/components/confirm-modal/CodeConfirmModal";

type Values = { narrative: string; expected_head: string };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const saved: FormSubmitResult = { state: "success", message: { title: "Saved" } };
function Fields({ onCancel }: { onCancel?: () => void } = {}) {
  const { methods, formState } = useFormContext<Values>();
  const { isDirty } = useFormState({ control: methods.control });
  return (
    <>
      <TextField label="Hazard narrative" {...methods.register("narrative")} />
      <output data-testid="state">
        {formState}:{String(isDirty)}
      </output>
      <FormStatus />
      <SubmitButton onCancel={onCancel} />
    </>
  );
}
function TestForm(props: Omit<FormProps<Values>, "children">) {
  return (
    <Form<Values>
      defaultValues={{ narrative: "Opened judgement", expected_head: "opened-version" }}
      disableWhenClean
      {...props}
    >
      <Fields />
    </Form>
  );
}
function routed(onSubmit: FormProps<Values>["onSubmit"], redirect = false, timeoutMs?: number) {
  function Page() {
    const navigate = useNavigate();
    return (
      <>
        <TestForm
          onSubmit={onSubmit}
          timeoutMs={timeoutMs}
          onSuccess={
            redirect
              ? () => {
                  void navigate("/other");
                }
              : undefined
          }
        />
        <Link to="/other">Other page</Link>
      </>
    );
  }
  const router = createMemoryRouter(
    [
      { path: "/edit", element: <Page /> },
      { path: "/other", element: <p>Other page content</p> },
    ],
    { initialEntries: ["/edit"] },
  );
  renderWithMantine(<RouterProvider router={router} />);
  return router;
}

describe("TH-001/TH-003: opened drafts and request boundaries", () => {
  it.each(["success", "partial_success"] as const)(
    "retains in-flight edits and restores warnings after %s",
    async (state) => {
      const user = userEvent.setup();
      const pending = deferred<FormSubmitResult>();
      const router = routed(() => pending.promise);
      const input = screen.getByLabelText("Hazard narrative");
      await user.clear(input);
      await user.type(input, "Submitted judgement");
      await user.click(screen.getByTestId("submit-button"));
      await user.type(input, " plus newer evidence");
      await act(async () => pending.resolve({ state, message: { title: "Saved" } }));
      expect(input).toHaveValue("Submitted judgement plus newer evidence");
      expect(screen.getByTestId("state")).toHaveTextContent(`${state}:true`);
      await user.click(screen.getByRole("link", { name: "Other page" }));
      expect(router.state.location.pathname).toBe("/edit");
      expect(screen.getByRole("dialog", { name: "Leave this page?" })).toBeInTheDocument();
    },
  );

  it.each(["success", "partial_success"] as const)(
    "protects fresh edits following %s",
    async (state) => {
      const user = userEvent.setup();
      const router = routed(async () => ({ state, message: { title: "Saved" } }));
      await user.type(screen.getByLabelText("Hazard narrative"), " saved");
      await user.click(screen.getByTestId("submit-button"));
      await screen.findByText("Saved");
      expect(screen.getByTestId("state")).toHaveTextContent(`${state}:false`);
      await user.type(screen.getByLabelText("Hazard narrative"), " unsaved");
      await user.click(screen.getByRole("link", { name: "Other page" }));
      expect(router.state.location.pathname).toBe("/edit");
    },
  );

  it("warns before leaving a request in progress", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult>();
    const router = routed(() => pending.promise);
    await user.type(screen.getByLabelText("Hazard narrative"), " save");
    await user.click(screen.getByTestId("submit-button"));
    await user.click(screen.getByRole("link", { name: "Other page" }));
    expect(router.state.location.pathname).toBe("/edit");
    await user.click(screen.getByRole("button", { name: "Stay" }));
    await act(async () => pending.resolve(saved));
  });

  it("guards simultaneous submit events below the button", async () => {
    const pending = deferred<FormSubmitResult>();
    const submit = vi.fn(() => pending.promise);
    renderWithMantine(<TestForm onSubmit={submit} />);
    const form = screen.getByTestId("submit-button").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(submit).toHaveBeenCalledOnce();
    await act(async () => pending.resolve(saved));
  });

  it("keeps timeout uncertainty, drafts and the opened version until the request settles", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult>();
    const submit = vi.fn<FormProps<Values>["onSubmit"]>(() => pending.promise);
    renderWithMantine(<TestForm onSubmit={submit} timeoutMs={30} />);
    await user.type(screen.getByLabelText("Hazard narrative"), " unsaved");
    await user.click(screen.getByTestId("submit-button"));
    await screen.findByText("Request timed out");
    // The save is handed only its data: nothing it could cancel itself with.
    expect(submit.mock.calls[0]).toHaveLength(1);
    expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByTestId("submit-button"));
    fireEvent.submit(screen.getByTestId("submit-button").closest("form")!);
    expect(submit).toHaveBeenCalledOnce();
    await act(async () => pending.resolve(saved));
    expect(screen.getByTestId("state")).toHaveTextContent("timeout:true");
    expect(screen.getByLabelText("Hazard narrative")).toHaveValue("Opened judgement unsaved");
    await user.click(screen.getByTestId("submit-button"));
    expect(submit.mock.calls[1]![0].expected_head).toBe("opened-version");
  });

  it("lets a save that succeeds after its timeout neither navigate nor clear the draft", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult>();
    const router = routed(() => pending.promise, true, 30);
    await user.type(screen.getByLabelText("Hazard narrative"), " unsaved");
    await user.click(screen.getByTestId("submit-button"));
    await screen.findByText("Request timed out");
    expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");

    await act(async () => pending.resolve(saved));

    expect(router.state.location.pathname).toBe("/edit");
    expect(screen.getByTestId("state")).toHaveTextContent("timeout:true");
    expect(screen.getByLabelText("Hazard narrative")).toHaveValue("Opened judgement unsaved");
  });

  it("blocks cancellation while an accepted request remains unresolved, including timeout", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult>();
    const cancel = vi.fn();
    renderWithMantine(
      <Form<Values>
        defaultValues={{ narrative: "Opened judgement", expected_head: "opened-version" }}
        onSubmit={() => pending.promise}
        timeoutMs={30}
      >
        <Fields onCancel={cancel} />
      </Form>,
    );
    await user.click(screen.getByTestId("submit-button"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).not.toHaveBeenCalled();
    await screen.findByText("Request timed out");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).not.toHaveBeenCalled();
    await act(async () => pending.resolve(saved));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("allows only explicit post-save navigation", async () => {
    const user = userEvent.setup();
    const router = routed(async () => saved, true);
    await user.type(screen.getByLabelText("Hazard narrative"), " saved");
    await user.click(screen.getByTestId("submit-button"));
    await screen.findByText("Other page content");
    expect(router.state.location.pathname).toBe("/other");
  });

  it("guards a clean form's synchronous departure before pending state has painted", async () => {
    const pending = deferred<FormSubmitResult>();
    let nativeWarning = false;
    function Page() {
      const navigate = useNavigate();
      return (
        <TestForm
          onSubmit={() => {
            const event = new Event("beforeunload", { cancelable: true });
            window.dispatchEvent(event);
            nativeWarning = event.defaultPrevented;
            void navigate("/other");
            return pending.promise;
          }}
        />
      );
    }
    const router = createMemoryRouter(
      [
        { path: "/edit", element: <Page /> },
        { path: "/other", element: <p>Other</p> },
      ],
      { initialEntries: ["/edit"] },
    );
    renderWithMantine(<RouterProvider router={router} />);
    fireEvent.submit(screen.getByTestId("submit-button").closest("form")!);
    await waitFor(() => expect(nativeWarning).toBe(true));
    expect(router.state.location.pathname).toBe("/edit");
    await act(async () => pending.resolve(saved));
  });

  it("does not auto-navigate over newer edits", async () => {
    const user = userEvent.setup();
    const pending = deferred<FormSubmitResult>();
    const router = routed(() => pending.promise, true);
    await user.type(screen.getByLabelText("Hazard narrative"), " submitted");
    await user.click(screen.getByTestId("submit-button"));
    await user.type(screen.getByLabelText("Hazard narrative"), " new draft");
    await act(async () => pending.resolve(saved));
    expect(router.state.location.pathname).toBe("/edit");
  });

  it("does not report a committed save as failed when destination navigation throws", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <TestForm
        onSubmit={async () => saved}
        onSuccess={() => {
          throw new Error("Route unavailable");
        }}
      />,
    );
    await user.type(screen.getByLabelText("Hazard narrative"), " saved");
    await user.click(screen.getByTestId("submit-button"));
    await screen.findByText("Saved, but could not open the next page");
    expect(screen.getByTestId("state")).toHaveTextContent("partial_success:false");
  });

  it.each(["partial_success", "error", "validation_error"] as const)(
    "does not auto-navigate on %s",
    async (state) => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithMantine(
        <TestForm
          onSubmit={async () => ({ state, message: { title: "Result" } })}
          onSuccess={onSuccess}
        />,
      );
      await user.type(screen.getByLabelText("Hazard narrative"), " submitted");
      await user.click(screen.getByTestId("submit-button"));
      await screen.findByText("Result");
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it("warns on native departure only while there is unsaved work", async () => {
    const user = userEvent.setup();
    renderWithMantine(<TestForm onSubmit={async () => saved} />);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.type(screen.getByLabelText("Hazard narrative"), " draft");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("refuses silently disabled SPA protection under a legacy router", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        renderWithMantine(
          <BrowserRouter>
            <TestForm onSubmit={async () => saved} />
          </BrowserRouter>,
        ),
      ).toThrow(/requires a data router/);
    } finally {
      error.mockRestore();
    }
  });
});

describe("field value and accessibility contracts", () => {
  it("does not smooth-scroll status messages under reduced motion", async () => {
    const media = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => true,
    }));
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    try {
      renderWithMantine(<FormStatus variant="success" title="Saved" />);
      await waitFor(() =>
        expect(scroll).toHaveBeenCalledWith({ behavior: "instant", block: "start" }),
      );
      expect(scroll).not.toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    } finally {
      media.mockRestore();
      scroll.mockRestore();
    }
  });
  it.each([
    ["03/04/2026", "2026-04-03"],
    ["15/04/2026", "2026-04-15"],
  ])("reads British keyboard date %s", async (typed, expected) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithMantine(<DateField label="Observed on" onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), typed!);
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });
  it.each(["31/02/2026", "29/02/2025", "2026-02-31", "04/31/2026", "15", "3/4/26"])(
    "rejects invalid or incomplete date %s",
    (value) => {
      expect(parseDateInput(value)).toBeNull();
    },
  );
  it.each(["29/02/2024", "2024-02-29", "29 February 2024"])(
    "accepts a leap day %s without a timezone conversion",
    (value) => {
      expect(parseDateInput(value)).toBe("2024-02-29");
    },
  );
  it("names open calendar navigation", async () => {
    const user = userEvent.setup();
    renderWithMantine(<DateField label="Observed on" />);
    await user.click(screen.getByRole("textbox"));
    expect(
      screen.getByRole("button", { name: "Previous calendar period" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next calendar period" })).toBeInTheDocument();
  });
  it("names the switch and honours its initial setting", () => {
    renderWithMantine(
      <SolidSwitch
        label="Email about hazard changes"
        defaultChecked
        description="Notification setting"
        error="Choose a setting"
      />,
    );
    const control = screen.getByRole("switch", { name: "Email about hazard changes" });
    expect(control).toBeChecked();
    expect(control).toHaveAccessibleDescription("Notification setting Choose a setting");
  });
  it("associates radio instructions and errors", () => {
    renderWithMantine(
      <RadioField
        label="Review type"
        description="Choose one"
        error="A review type is required"
        options={[{ value: "peer", label: "Peer review" }]}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription(/Choose one/);
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription(
      /A review type is required/,
    );
  });
});

describe("TH-005: identity confirmation", () => {
  it("passes an existing long password without truncation", async () => {
    const user = userEvent.setup();
    const password = "Existing-passphrase-".repeat(8);
    const onConfirm = vi.fn();
    renderWithMantine(
      <PasswordConfirmModal
        opened
        title="Confirm identity"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      >
        Confirm this change
      </PasswordConfirmModal>,
    );
    await user.type(screen.getByLabelText("Password"), password);
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(password);
  });
  it.each(["password", "code"] as const)(
    "isolates an old %s failure from a reopened dialog",
    async (kind) => {
      const user = userEvent.setup();
      const pending = deferred<void>();
      const Modal = kind === "password" ? PasswordConfirmModal : CodeConfirmModal;
      const field = kind === "password" ? "Password" : "Authenticator code";
      const onConfirm = vi.fn(() => pending.promise);
      const onClose = vi.fn();
      function modal(opened: boolean) {
        return (
          <Modal
            opened={opened}
            title="Confirm identity"
            onConfirm={onConfirm}
            onClose={onClose}
          >
            Fixture action
          </Modal>
        );
      }
      const view = renderWithMantine(modal(true));
      await user.type(
        screen.getByLabelText(field),
        kind === "password" ? "old-password" : "123456",
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));
      await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
      view.rerender(modal(false));
      view.rerender(modal(true));
      expect(screen.getByLabelText(field)).toHaveValue("");
      await act(async () => pending.reject(new Error("Old attempt failed")));
      expect(screen.queryByText("Old attempt failed")).not.toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    },
  );
});
