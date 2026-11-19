import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, expectInlineStyle } from "@/test/test-utils";
import SelectField from "./SelectField";
import dropdownClasses from "./dropdownGroupLabel.module.css";

const options = [
  { value: "1", label: "James Green" },
  { value: "2", label: "Sarah Mitchell" },
];

describe("SelectField", () => {
  it("renders with a label", () => {
    renderWithMantine(<SelectField label="Patient" data={options} />);
    expect(screen.getByText("Patient")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderWithMantine(
      <SelectField label="Patient" placeholder="Select a patient" data={options} />,
    );
    expect(screen.getByPlaceholderText("Select a patient")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    renderWithMantine(<SelectField label="Patient" data={options} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("James Green")).toBeInTheDocument();
    expect(screen.getByText("Sarah Mitchell")).toBeInTheDocument();
  });

  it("applies standardised label styles", () => {
    renderWithMantine(<SelectField label="Patient" data={options} />);

    const label = screen.getByText("Patient");
    expectInlineStyle(label, {
      fontSize: "var(--mantine-font-size-md)",
      color: "var(--mantine-color-text)",
      marginBottom: "0.25rem",
    });
  });

  it("applies standardised input font size", () => {
    renderWithMantine(<SelectField label="Patient" placeholder="Select" data={options} />);

    const input = screen.getByRole("combobox");
    expectInlineStyle(input, {
      fontSize: "var(--mantine-font-size-md)",
    });
  });

  it("renders as disabled when disabled prop is set", () => {
    renderWithMantine(<SelectField label="Patient" data={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("draws each group heading as a divider, not an option", async () => {
    // Styled centred and navy between two rules; the class is what
    // carries that, so it is what this pins
    const user = userEvent.setup();
    renderWithMantine(
      <SelectField
        label="Competency"
        data={[
          {
            group: "Oncology",
            items: [
              { value: "prescribe_sact", label: "Prescribe SACT" },
              { value: "assess_sact_toxicity", label: "Assess SACT toxicity" },
            ],
          },
          {
            group: "Others",
            items: [
              {
                value: "take_informed_consent",
                label: "Take informed consent",
              },
              { value: "request_plain_xray", label: "Request plain X-rays" },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const heading = await screen.findByText("Oncology");
    expect(heading).toHaveClass(dropdownClasses.groupLabel ?? "missing-css-module-class");
    expect(screen.queryByRole("option", { name: "Oncology" })).not.toBeInTheDocument();
  });
});
