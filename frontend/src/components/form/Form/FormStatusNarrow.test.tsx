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
}: {
  onSubmit: (data: TestFormValues) => Promise<FormSubmitResult>;
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
        <FormStatusNarrow />
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
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
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

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
