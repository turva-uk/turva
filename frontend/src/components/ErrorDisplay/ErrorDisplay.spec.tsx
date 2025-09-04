import { composeStories } from "@storybook/react";
import * as Stories from "./ErrorDisplay.stories";
import { render, screen, waitFor } from "../../testRender";
import { userEvent } from "@testing-library/user-event";

const { WithErrorString, WithHttpError, WithNoErrorPassed, WithComplexErrorDetail } = composeStories(Stories)

describe("when a string error is passed", () => {
  test("renders the error message", () => {
    render(<WithErrorString />);
    expect(screen.getByText("This is an error")).toBeInTheDocument();
  });

  test("renders a complex error message", () => {
    render(<WithErrorString />);
    expect(screen.getByText("This is an error")).toBeInTheDocument();
  });
});

describe("when no error is passed", () => {
  test("renders no error message", () => {
    render(<WithNoErrorPassed />);
    expect(screen.queryByText("This is an error")).toBeNull();
  });
});

describe("when an http error is passed", () => {
  test("renders the error message", () => {
    render(<WithHttpError />);
    expect(screen.getByText("This is an error")).toBeInTheDocument();
  });
  
  test("the dropdown shows the status code", async () => {
    render(<WithHttpError />);
    await userEvent.click(screen.getByText(/more details/i));
    await waitFor(() => {
      expect(screen.getByText("HTTP error code: 404")).toBeInTheDocument();
    });
  });
});

describe("when a complex error details is passed", () => {
  test("renders a generic error header", () => {
    render(<WithComplexErrorDetail />);
    expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
  });
  
  test("the dropdown shows the status code and detailed error", async () => {
    render(<WithComplexErrorDetail />);
    await userEvent.click(screen.getByText(/more details/i));
    await waitFor(() => {
      expect(screen.getByText(/http error code:/i)).toBeInTheDocument();
      expect(screen.getByText(/400/i)).toBeInTheDocument();
      expect(screen.getByText(/{"error":"This is an error in a JSON string!"}/i)).toBeInTheDocument();
    });
  });
});
