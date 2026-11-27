import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine, expectInlineStyle } from "@/test/test-utils";
import MultiSelectField from "./MultiSelectField";
import dropdownClasses from "./dropdownGroupLabel.module.css";

const options = [
  { value: "1", label: "Dr Fenwick" },
  { value: "2", label: "Nurse Adams" },
];

describe("MultiSelectField", () => {
  it("renders with a label", () => {
    renderWithMantine(<MultiSelectField label="Participants" data={options} />);
    expect(screen.getByText("Participants")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderWithMantine(
      <MultiSelectField label="Participants" placeholder="Add staff" data={options} />,
    );
    expect(screen.getByPlaceholderText("Add staff")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    renderWithMantine(<MultiSelectField label="Participants" data={options} />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("Dr Fenwick").length).toBeGreaterThan(0);
    expect(screen.getByText("Nurse Adams")).toBeInTheDocument();
  });

  it("applies standardised label styles", () => {
    renderWithMantine(<MultiSelectField label="Participants" data={options} />);

    const label = screen.getByText("Participants");
    expectInlineStyle(label, {
      fontSize: "var(--mantine-font-size-md)",
      color: "var(--mantine-color-text)",
      marginBottom: "0.25rem",
    });
  });

  it("renders as disabled when disabled prop is set", () => {
    renderWithMantine(<MultiSelectField label="Participants" data={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("draws each group heading as a divider, not an option", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <MultiSelectField
        label="Competencies"
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

  it("names each pill's remove button and lets the keyboard reach it", async () => {
    const onChange = vi.fn();
    renderWithMantine(
      <MultiSelectField
        label="Clinicians"
        data={options}
        value={["1", "2"]}
        onChange={onChange}
      />,
    );

    const remove = screen.getByRole("button", { name: "Remove Dr Fenwick" });
    expect(remove).not.toHaveAttribute("aria-hidden", "true");
    expect(remove).toHaveAttribute("tabindex", "0");
    remove.focus();
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(["2"]);
  });

  it("names the remove button as removeLabel says", () => {
    renderWithMantine(
      <MultiSelectField
        label="Clinicians"
        data={options}
        value={["1"]}
        removeLabel={(option) => `Remove ${option.value} from clinicians`}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove 1 from clinicians" }),
    ).toBeInTheDocument();
  });

  it("shows a value no longer among the choices, rather than dropping it", () => {
    renderWithMantine(<MultiSelectField label="Clinicians" data={options} value={["9"]} />);

    expect(screen.getByRole("button", { name: "Remove 9" })).toBeInTheDocument();
  });

  it.each([
    ["read only", { readOnly: true }],
    ["disabled", { disabled: true }],
  ])("offers no remove button when %s", (_, state) => {
    renderWithMantine(
      <MultiSelectField label="Clinicians" data={options} value={["1"]} {...state} />,
    );

    expect(screen.getAllByText("Dr Fenwick").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Remove Dr Fenwick" })).not.toBeInTheDocument();
  });
});
