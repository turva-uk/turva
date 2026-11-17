import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, expectInlineStyle } from "@/test/test-utils";
import DateField from "./DateField";

describe("DateField", () => {
  it("renders with a label", () => {
    renderWithMantine(<DateField label="Observed on" />);
    expect(screen.getByText("Observed on")).toBeInTheDocument();
  });

  it("renders a British-format placeholder by default", () => {
    renderWithMantine(<DateField label="Observed on" />);
    expect(screen.getByPlaceholderText("DD/MM/YYYY")).toBeInTheDocument();
  });

  it("renders a description", () => {
    renderWithMantine(
      <DateField label="Performed on" description="The day the procedure happened" />,
    );
    expect(screen.getByText("The day the procedure happened")).toBeInTheDocument();
  });

  it("renders an error message", () => {
    renderWithMantine(
      <DateField label="Observed on" error="Enter the date you observed this" />,
    );
    expect(screen.getByText("Enter the date you observed this")).toBeInTheDocument();
  });

  describe("String values, never Date objects", () => {
    it("displays a YYYY-MM-DD value in British long form", () => {
      // The backend sends and accepts YYYY-MM-DD. Converting to Date and
      // back is where a timezone shifts a clinical date by a day.
      renderWithMantine(<DateField label="Observed on" defaultValue="2026-03-12" />);
      expect(screen.getByDisplayValue("12 March 2026")).toBeInTheDocument();
    });

    it("reports a chosen date back as a YYYY-MM-DD string", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderWithMantine(
        <DateField label="Observed on" defaultValue="2026-03-12" onChange={onChange} />,
      );

      await user.click(screen.getByRole("textbox"));
      await user.click(screen.getByText("14"));

      expect(onChange).toHaveBeenCalledWith("2026-03-14");
    });
  });

  describe("Styling", () => {
    it("applies the standardised label styles", () => {
      renderWithMantine(<DateField label="Observed on" />);

      expectInlineStyle(screen.getByText("Observed on"), {
        fontSize: "var(--mantine-font-size-md)",
        color: "var(--mantine-color-text)",
        marginBottom: "0.25rem",
      });
    });

    it("applies the standardised input font size", () => {
      renderWithMantine(<DateField label="Observed on" />);

      expectInlineStyle(screen.getByRole("textbox"), {
        fontSize: "var(--mantine-font-size-md)",
      });
    });
  });

  describe("Constraints are the form's to impose", () => {
    it("allows a future date unless the caller sets maxDate", () => {
      // A certificate expiry is legitimately in the future, so the field
      // imposes no rule of its own.
      renderWithMantine(<DateField label="Expires on" defaultValue="2030-01-01" />);
      expect(screen.getByDisplayValue("1 January 2030")).toBeInTheDocument();
    });
  });

  it("can be disabled", () => {
    renderWithMantine(<DateField label="Signed on" defaultValue="2026-03-14" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("names the clear button for screen readers", () => {
    renderWithMantine(<DateField label="Observed on" defaultValue="2026-03-14" clearable />);
    expect(screen.getByRole("button", { name: "Clear date" })).toBeInTheDocument();
  });

  it("lets a caller rename the clear button", () => {
    renderWithMantine(
      <DateField
        label="Observed on"
        defaultValue="2026-03-14"
        clearable
        clearButtonProps={{ "aria-label": "Clear observed date" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear observed date" })).toBeInTheDocument();
  });
});
