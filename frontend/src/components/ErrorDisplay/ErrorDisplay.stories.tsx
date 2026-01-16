import preview from "#.storybook/preview";
import { expect, waitFor } from "storybook/test";
import ErrorDisplay from "./ErrorDisplay";

const meta = preview.meta({
  title: "Components/Error display",
  component: ErrorDisplay,
});

export const WithErrorString = meta.story({
  render: () => {
    return <ErrorDisplay title="Error logging in" error={"This is an error"} />;
  },
});

export const WithNoErrorPassed = meta.story({
  render: () => {
    return <ErrorDisplay title="Error logging in" error={null} />;
  },
});

export const WithHttpError = meta.story({
  render: () => {
    return (
      <ErrorDisplay
        title="Error logging in"
        error={{
          detail: "This is an error",
          statusCode: "404",
        }}
      />
    );
  },
});

export const WithComplexErrorDetail = meta.story({
  render: () => {
    return (
      <ErrorDisplay
        title="Error logging in"
        error={{
          detail: { error: "This is an error in a JSON string!" },
          statusCode: "400",
        }}
      />
    );
  },
});

WithErrorString.test("renders the error message", async ({ canvas }) => {
  await waitFor(() => {
    expect(canvas.getByText("This is an error")).toBeInTheDocument();
  });
});

WithNoErrorPassed.test("renders no error message", async ({ canvas }) => {
  await waitFor(() => {
    expect(canvas.queryByText("This is an error")).toBeNull();
  });
});

WithHttpError.test("renders the error message", async ({ canvas }) => {
  await waitFor(() => {
    expect(canvas.getByText("This is an error")).toBeInTheDocument();
  });
});

WithHttpError.test("the dropdown shows the status code", async ({ canvas }) => {
  const moreDetailsButton = await canvas.getByText(/more details/i);
  await moreDetailsButton.click();
  await waitFor(() => {
    expect(canvas.getByText("HTTP error code: 404")).toBeInTheDocument();
  });
});

WithComplexErrorDetail.test(
  "renders a generic error header",
  async ({ canvas }) => {
    await waitFor(() => {
      expect(canvas.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  },
);

WithComplexErrorDetail.test(
  "the dropdown shows the status code and detailed error",
  async ({ canvas }) => {
    const moreDetailsButton = await canvas.getByText(/more details/i);
    await moreDetailsButton.click();
    await waitFor(() => {
      expect(canvas.getByText(/HTTP error code:/i)).toBeInTheDocument();
      expect(canvas.getByText(/400/i)).toBeInTheDocument();
      expect(
        canvas.getByText(`{"error":"This is an error in a JSON string!"}`),
      ).toBeInTheDocument();
    });
  },
);
