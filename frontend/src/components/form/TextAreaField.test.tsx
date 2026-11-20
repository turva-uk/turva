import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, expectInlineStyle } from "@/test/test-utils";
import TextAreaField from "./TextAreaField";

describe("TextAreaField", () => {
  it("renders with a label", () => {
    renderWithMantine(<TextAreaField label="Message" />);
    expect(screen.getByText("Message")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderWithMantine(<TextAreaField label="Message" placeholder="Type your message…" />);
    expect(screen.getByPlaceholderText("Type your message…")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    renderWithMantine(<TextAreaField label="Message" />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello there");
    expect(textarea).toHaveValue("Hello there");
  });

  it("applies standardised label styles", () => {
    renderWithMantine(<TextAreaField label="Message" />);

    const label = screen.getByText("Message");
    expectInlineStyle(label, {
      fontSize: "var(--mantine-font-size-md)",
      color: "var(--mantine-color-text)",
      marginBottom: "0.25rem",
    });
  });

  it("applies standardised input font size", () => {
    renderWithMantine(<TextAreaField label="Message" placeholder="Type here" />);

    const textarea = screen.getByRole("textbox");
    expectInlineStyle(textarea, {
      fontSize: "var(--mantine-font-size-md)",
    });
  });

  it("renders as disabled when disabled prop is set", () => {
    renderWithMantine(<TextAreaField label="Message" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
