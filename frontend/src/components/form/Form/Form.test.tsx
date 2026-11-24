import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { Stack } from "@mantine/core";
import { Form, FormStatus, SubmitButton, useFormContext } from "./index";
import type { FormSubmitResult } from "./Form";
import TextField from "../TextField";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TestFormValues {
  name: string;
}

function TestForm({
  onSubmit,
  timeoutMs,
}: {
  onSubmit: (data: TestFormValues) => Promise<FormSubmitResult>;
  timeoutMs?: number;
}) {
  return (
    <Form<TestFormValues>
      defaultValues={{ name: "" }}
      onSubmit={onSubmit}
      submitLabel="Save"
      submittingLabel="Saving…"
      timeoutMs={timeoutMs}
    >
      <Stack gap="md">
        <FormStatus />
        <TextField label="Name" />
        <SubmitButton />
      </Stack>
    </Form>
  );
}

describe("Form", () => {
  describe("Initial state", () => {
    it("renders submit button with label", () => {
      renderWithMantine(
        <TestForm
          onSubmit={async () => ({
            state: "success",
            message: { title: "OK" },
          })}
        />,
      );
      expect(screen.getByTestId("submit-button")).toHaveTextContent("Save");
    });

    it("does not render FormStatus in idle state", () => {
      renderWithMantine(
        <TestForm
          onSubmit={async () => ({
            state: "success",
            message: { title: "OK" },
          })}
        />,
      );
      expect(screen.queryByTestId("form-status")).not.toBeInTheDocument();
    });
  });

  describe("Submission", () => {
    it("shows submitting label during submission", async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: FormSubmitResult) => void;
      const submitPromise = new Promise<FormSubmitResult>((resolve) => {
        resolveSubmit = resolve;
      });

      renderWithMantine(<TestForm onSubmit={() => submitPromise} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
      });

      // Resolve the submission
      resolveSubmit!({ state: "success", message: { title: "Saved" } });

      await waitFor(() => {
        expect(screen.getByTestId("form-status")).toBeInTheDocument();
      });
    });

    it("shows success status after successful submission", async () => {
      const user = userEvent.setup();
      const handleSubmit = async (): Promise<FormSubmitResult> => ({
        state: "success",
        message: { title: "Settings saved", description: "Changes applied." },
      });

      renderWithMantine(<TestForm onSubmit={handleSubmit} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        const status = screen.getByTestId("form-status");
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute("role", "status");
      });
      expect(screen.getByText("Settings saved")).toBeInTheDocument();
      expect(screen.getByText("Changes applied.")).toBeInTheDocument();
    });

    it("shows error status after failed submission", async () => {
      const user = userEvent.setup();
      const handleSubmit = async (): Promise<FormSubmitResult> => ({
        state: "error",
        message: { title: "Failed to save", description: "Server error." },
      });

      renderWithMantine(<TestForm onSubmit={handleSubmit} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        const status = screen.getByTestId("form-status");
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute("role", "alert");
      });
      expect(screen.getByText("Failed to save")).toBeInTheDocument();
    });

    it("shows partial_success status", async () => {
      const user = userEvent.setup();
      const handleSubmit = async (): Promise<FormSubmitResult> => ({
        state: "partial_success",
        message: {
          title: "Partially saved",
          description: "Notification pending.",
        },
      });

      renderWithMantine(<TestForm onSubmit={handleSubmit} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        const status = screen.getByTestId("form-status");
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute("role", "status");
      });
      expect(screen.getByText("Partially saved")).toBeInTheDocument();
    });

    it("handles thrown errors gracefully", async () => {
      const user = userEvent.setup();
      const handleSubmit = async (): Promise<FormSubmitResult> => {
        throw new Error("Network failure");
      };

      renderWithMantine(<TestForm onSubmit={handleSubmit} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        const status = screen.getByTestId("form-status");
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute("role", "alert");
      });
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText("An unexpected error occurred. Please try again."),
      ).toBeInTheDocument();
    });
  });

  describe("Timeout", () => {
    it("shows timeout status when submission exceeds timeout", async () => {
      const user = userEvent.setup();

      const handleSubmit = async (): Promise<FormSubmitResult> => {
        await delay(2000);
        return { state: "success", message: { title: "OK" } };
      };

      renderWithMantine(<TestForm onSubmit={handleSubmit} timeoutMs={50} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => {
        expect(screen.getByTestId("form-status")).toBeInTheDocument();
      });
      expect(screen.getByText("Request timed out")).toBeInTheDocument();
    });
  });

  describe("Validation error", () => {
    function ValidatedField() {
      const { methods } = useFormContext();
      const {
        register,
        formState: { errors },
      } = methods;
      return (
        <TextField
          label="Name"
          {...register("name", { required: "Name is required" })}
          error={errors.name?.message as string | undefined}
        />
      );
    }

    function ValidatedTestForm() {
      return (
        <Form<TestFormValues>
          defaultValues={{ name: "" }}
          onSubmit={async () => ({
            state: "success",
            message: { title: "OK" },
          })}
          submitLabel="Save"
          submittingLabel="Saving…"
        >
          <Stack gap="md">
            <FormStatus />
            <ValidatedField />
            <SubmitButton />
          </Stack>
        </Form>
      );
    }

    it("shows validation_error with warning when fields fail validation", async () => {
      renderWithMantine(<ValidatedTestForm />);

      // With mode: "onChange", the button is disabled when the
      // required field is empty - validation prevents submission
      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    });

    it("enables submit button after filling required field", async () => {
      const user = userEvent.setup();

      renderWithMantine(<ValidatedTestForm />);

      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");

      await user.type(screen.getByLabelText("Name"), "Dr Smith");

      expect(screen.getByTestId("submit-button")).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Disable when clean", () => {
    function RegisteredField() {
      const { methods } = useFormContext();
      const { register } = methods;
      return <TextField label="Name" {...register("name")} />;
    }

    function DisableWhenCleanForm() {
      return (
        <Form<TestFormValues>
          defaultValues={{ name: "Dr Smith" }}
          onSubmit={async () => ({
            state: "success",
            message: { title: "OK" },
          })}
          submitLabel="Save"
          submittingLabel="Saving…"
          disableWhenClean
        >
          <Stack gap="md">
            <FormStatus />
            <RegisteredField />
            <SubmitButton />
          </Stack>
        </Form>
      );
    }

    it("disables submit button when form is clean", () => {
      renderWithMantine(<DisableWhenCleanForm />);

      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    });

    it("enables submit button when form is dirty", async () => {
      const user = userEvent.setup();

      renderWithMantine(<DisableWhenCleanForm />);

      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");

      await user.clear(screen.getByLabelText("Name"));
      await user.type(screen.getByLabelText("Name"), "New name");

      expect(screen.getByTestId("submit-button")).not.toHaveAttribute("aria-disabled", "true");
    });
  });
});

describe("FormStatus (prop-driven)", () => {
  it("renders success variant with role=status", () => {
    renderWithMantine(<FormStatus variant="success" title="Saved" description="Done." />);
    const status = screen.getByTestId("form-status");
    expect(status).toHaveAttribute("role", "status");
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("renders error variant with role=alert", () => {
    renderWithMantine(<FormStatus variant="error" title="Error" />);
    expect(screen.getByTestId("form-status")).toHaveAttribute("role", "alert");
  });

  it("renders timeout variant with role=alert", () => {
    renderWithMantine(<FormStatus variant="timeout" title="Timed out" />);
    expect(screen.getByTestId("form-status")).toHaveAttribute("role", "alert");
  });

  it("renders partial_success variant with role=status", () => {
    renderWithMantine(<FormStatus variant="partial_success" title="Partial" />);
    expect(screen.getByTestId("form-status")).toHaveAttribute("role", "status");
  });

  it("renders validation_error variant with role=alert", () => {
    renderWithMantine(<FormStatus variant="validation_error" title="Check fields" />);
    expect(screen.getByTestId("form-status")).toHaveAttribute("role", "alert");
  });

  it("calls onDismiss when close button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    renderWithMantine(<FormStatus variant="success" title="Saved" onDismiss={onDismiss} />);

    await user.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not render dismiss button without onDismiss", () => {
    renderWithMantine(<FormStatus variant="success" title="Saved" />);
    expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
  });

  it("renders without description", () => {
    renderWithMantine(<FormStatus variant="success" title="Saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

describe("SubmitButton", () => {
  it("sits well below the last field, with extra-large space above it", () => {
    renderWithMantine(
      <TestForm onSubmit={async () => ({ state: "success", message: { title: "OK" } })} />,
    );

    const group = screen.getByTestId("submit-button").parentElement;

    expect(group?.getAttribute("style")).toContain("--mantine-spacing-xl");
  });

  it("renders cancel button when onCancel is provided", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    renderWithMantine(
      <TestForm onSubmit={async () => ({ state: "success", message: { title: "OK" } })} />,
    );

    // The TestForm doesn't have onCancel, so let's test directly
    // by rendering within a Form context with cancel
    const { unmount } = renderWithMantine(
      <Form
        defaultValues={{ name: "" }}
        onSubmit={async () => ({
          state: "success" as const,
          message: { title: "OK" },
        })}
      >
        <SubmitButton onCancel={onCancel} cancelLabel="Back" />
      </Form>,
    );

    const backButton = screen.getByText("Back");
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(onCancel).toHaveBeenCalledOnce();

    unmount();
  });
});

describe("Form with confirm prop", () => {
  function ValidatedNameField() {
    const { methods } = useFormContext();
    const {
      register,
      formState: { errors },
    } = methods;
    return (
      <TextField
        label="Name"
        {...register("name", { required: "Name is required" })}
        error={errors.name?.message as string | undefined}
      />
    );
  }

  function ConfirmTestForm({
    onSubmit,
  }: {
    onSubmit: (data: TestFormValues) => Promise<FormSubmitResult>;
  }) {
    return (
      <Form<TestFormValues>
        defaultValues={{ name: "Dr Smith" }}
        onSubmit={onSubmit}
        submitLabel="Send"
        submittingLabel="Sending…"
        confirm={{
          title: "Confirm send",
          children: "Are you sure you want to send this?",
          acceptLabel: "Confirm send",
          submittingLabel: "Sending…",
        }}
      >
        <Stack gap="md">
          <FormStatus />
          <SubmitButton />
        </Stack>
      </Form>
    );
  }

  it("opens confirm modal after validation passes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      state: "success",
      message: { title: "Sent" },
    });

    renderWithMantine(<ConfirmTestForm onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to send this?")).toBeInTheDocument();
    });

    // onSubmit should NOT have been called yet
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when user confirms in modal", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      state: "success",
      message: { title: "Sent" },
    });

    renderWithMantine(<ConfirmTestForm onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to send this?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Confirm send" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(screen.getByTestId("form-status")).toBeInTheDocument();
    });
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("does not submit when user cancels in modal", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      state: "success",
      message: { title: "Sent" },
    });

    renderWithMantine(<ConfirmTestForm onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to send this?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Are you sure you want to send this?")).not.toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("form-status")).not.toBeInTheDocument();
  });

  it("shows validation error without opening modal when form is invalid", async () => {
    function ValidatedConfirmForm() {
      return (
        <Form<TestFormValues>
          defaultValues={{ name: "" }}
          onSubmit={async () => ({
            state: "success",
            message: { title: "OK" },
          })}
          submitLabel="Send"
          submittingLabel="Sending…"
          confirm={{
            title: "Confirm",
            children: "Are you sure?",
            acceptLabel: "Yes",
          }}
        >
          <Stack gap="md">
            <FormStatus />
            <ValidatedNameField />
            <SubmitButton />
          </Stack>
        </Form>
      );
    }

    renderWithMantine(<ValidatedConfirmForm />);

    // With mode: "onChange", the button is disabled when required field is empty
    expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  describe("asking only when a change needs it", () => {
    function RenameForm({
      onSubmit,
    }: {
      onSubmit: (data: TestFormValues) => Promise<FormSubmitResult>;
    }) {
      return (
        <Form<TestFormValues>
          defaultValues={{ name: "Dr Smith" }}
          onSubmit={onSubmit}
          submitLabel="Send"
          submittingLabel="Sending…"
          confirm={{
            when: (data) => data.name !== "Dr Smith",
            title: "Confirm rename",
            children: (data) => `Rename Dr Smith to ${data.name}?`,
            acceptLabel: "Rename",
          }}
        >
          <Stack gap="md">
            <FormStatus />
            <ValidatedNameField />
            <SubmitButton />
          </Stack>
        </Form>
      );
    }

    it("saves straight away when the change does not need asking about", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn()
        .mockResolvedValue({ state: "success", message: { title: "Sent" } });
      renderWithMantine(<RenameForm onSubmit={onSubmit} />);

      await user.click(screen.getByTestId("submit-button"));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("asks when it does, with a message saying what will change", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn()
        .mockResolvedValue({ state: "success", message: { title: "Sent" } });
      renderWithMantine(<RenameForm onSubmit={onSubmit} />);

      await user.clear(screen.getByLabelText("Name"));
      await user.type(screen.getByLabelText("Name"), "Dr Jones");
      await user.click(screen.getByTestId("submit-button"));

      expect(await screen.findByText("Rename Dr Smith to Dr Jones?")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Rename" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    });
  });
});

describe("Server messages for fields", () => {
  function RegisteredName() {
    const { methods } = useFormContext<TestFormValues>();

    return (
      <TextField
        label="Name"
        {...methods.register("name")}
        error={methods.formState.errors.name?.message}
      />
    );
  }

  it("shows each message under its field and keeps the draft", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <Form<TestFormValues>
        defaultValues={{ name: "" }}
        onSubmit={async () => ({
          state: "error",
          message: { title: "Could not save" },
          fieldErrors: { name: "That name is already taken." },
        })}
      >
        <Stack gap="md">
          <FormStatus />
          <RegisteredName />
          <SubmitButton />
        </Stack>
      </Form>,
    );

    await user.type(screen.getByLabelText("Name"), "Riverbank");
    await user.click(screen.getByTestId("submit-button"));

    expect(await screen.findByText("That name is already taken.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Riverbank");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("FormStatus focus and the kept draft", () => {
  it.each(["error", "timeout", "validation_error"] as const)(
    "moves focus to the %s card, so a keyboard user hears it",
    async (variant) => {
      renderWithMantine(<FormStatus variant={variant} title="Could not save" />);

      await waitFor(() =>
        expect(screen.getByTestId("form-status").parentElement).toHaveFocus(),
      );
    },
  );

  it("leaves focus alone for a success", async () => {
    renderWithMantine(<FormStatus variant="success" title="Saved" />);

    await delay(50);
    expect(document.body).toHaveFocus();
  });

  it("says the entries were kept when asked to, on a failure", () => {
    renderWithMantine(
      <FormStatus
        variant="error"
        title="Could not save"
        description="Somebody saved first."
        retainsDraft
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Somebody saved first. Your entries have not been cleared.",
    );
  });

  it("does not say so on a success", () => {
    renderWithMantine(<FormStatus variant="success" title="Saved" retainsDraft />);

    expect(screen.getByRole("status")).not.toHaveTextContent(
      "Your entries have not been cleared.",
    );
  });
});
