import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { Stack } from "@mantine/core";
import { Form, FormStatusNarrow, SubmitButton } from "./index";
import type { FormSubmitResult } from "./Form";
import TextField from "../TextField";

interface TestFormValues {
  name: string;
}

function TestForm({
  onSubmit,
  retainsDraft = false,
}: {
  onSubmit: (data: TestFormValues) => Promise<FormSubmitResult>;
  retainsDraft?: boolean;
}) {
  return (
    <Form<TestFormValues>
      defaultValues={{ name: "" }}
      onSubmit={onSubmit}
      submitLabel="Save"
      submittingLabel="Saving…"
    >
      <Stack gap="md">
        <TextField label="Name" />
        <FormStatusNarrow retainsDraft={retainsDraft} />
        <SubmitButton />
      </Stack>
    </Form>
  );
}

describe("FormStatusNarrow", () => {
  it("renders nothing in idle state", () => {
    renderWithMantine(
      <TestForm
        onSubmit={async () => ({
          state: "success",
          message: { title: "OK" },
        })}
      />,
    );

    expect(screen.queryByText("OK")).not.toBeInTheDocument();
  });

  it("renders nothing on success", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <TestForm
        onSubmit={async () => ({
          state: "success",
          message: { title: "Saved successfully" },
        })}
      />,
    );

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
    });
  });

  it("displays error message on error state", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <TestForm
        onSubmit={async () => ({
          state: "error",
          message: { title: "Something went wrong" },
        })}
      />,
    );

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    });
  });

  it("puts the server's reason after the title, on the same line", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <TestForm
        onSubmit={async () => ({
          state: "error",
          message: {
            title: "Could not sign you in",
            description: "Email address or password is incorrect.",
          },
        })}
      />,
    );

    await user.click(screen.getByTestId("submit-button"));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "Could not sign you in. Email address or password is incorrect.",
    );
    expect(screen.queryByTestId("form-status")).not.toBeInTheDocument();
  });

  it("says the entries were kept when asked", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <TestForm
        retainsDraft
        onSubmit={async () => ({
          state: "error",
          message: { title: "Could not register", description: "That email is taken." },
        })}
      />,
    );

    await user.click(screen.getByTestId("submit-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not register. That email is taken. Your entries have not been cleared.",
    );
  });

  it("takes focus when a submission fails", async () => {
    const user = userEvent.setup();

    renderWithMantine(
      <TestForm
        onSubmit={async () => ({
          state: "error",
          message: { title: "Something went wrong" },
        })}
      />,
    );

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("form-status-narrow")).toHaveFocus();
    });
  });

  it("renders nothing during submitting", async () => {
    const user = userEvent.setup();

    renderWithMantine(<TestForm onSubmit={() => new Promise(() => {})} />);

    await user.click(screen.getByTestId("submit-button"));

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  describe("manual mode", () => {
    it("renders message from props", () => {
      renderWithMantine(<FormStatusNarrow message="Invalid credentials" />);

      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });

    it("does not take focus, since nothing was submitted", () => {
      renderWithMantine(<FormStatusNarrow message="Invalid credentials" />);

      expect(screen.getByTestId("form-status-narrow")).not.toHaveFocus();
    });
  });
});
