import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, expectInlineStyle } from "@/test/test-utils";
import TextField from "./TextField";

describe("TextField", () => {
  it("renders with a label", () => {
    renderWithMantine(<TextField label="Subject" />);
    expect(screen.getByText("Subject")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderWithMantine(<TextField label="Name" placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    renderWithMantine(<TextField label="Subject" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    expect(input).toHaveValue("Hello");
  });

  it("applies standardised label styles", () => {
    renderWithMantine(<TextField label="Subject" />);

    const label = screen.getByText("Subject");
    expectInlineStyle(label, {
      fontSize: "var(--mantine-font-size-md)",
      color: "var(--mantine-color-text)",
      marginBottom: "0.25rem",
    });
  });

  it("applies standardised input font size", () => {
    renderWithMantine(<TextField label="Subject" placeholder="Type here" />);

    const input = screen.getByRole("textbox");
    expectInlineStyle(input, {
      fontSize: "var(--mantine-font-size-md)",
    });
  });

  it("renders as disabled when disabled prop is set", () => {
    renderWithMantine(<TextField label="Subject" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
