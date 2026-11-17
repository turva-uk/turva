import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import RadioField from "./RadioField";
import classes from "./RadioField.module.css";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("RadioField", () => {
  it("pads each tappable label and moves the radio with it on phones", () => {
    const { container } = renderWithMantine(
      <RadioField options={options} value={null} onChange={() => {}} />,
    );
    const labels = container.querySelectorAll(".mantine-Radio-label");
    const inners = container.querySelectorAll(".mantine-Radio-inner");
    expect(labels).toHaveLength(3);
    labels.forEach((label) =>
      expect(label).toHaveClass(classes.label ?? "missing-css-module-class"),
    );
    inners.forEach((inner) =>
      expect(inner).toHaveClass(classes.inner ?? "missing-css-module-class"),
    );
  });
  it("renders all options", () => {
    renderWithMantine(<RadioField options={options} value={null} onChange={() => {}} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("renders with a label", () => {
    renderWithMantine(
      <RadioField label="Pick one" options={options} value={null} onChange={() => {}} />,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("shows the selected value", () => {
    renderWithMantine(<RadioField options={options} value="b" onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[1]).toBeChecked();
  });

  it("calls onChange when an option is selected", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    renderWithMantine(<RadioField options={options} value={null} onChange={handleChange} />);

    await user.click(screen.getByText("Option A"));
    expect(handleChange).toHaveBeenCalledWith("a");
  });

  it("disables all options when disabled", () => {
    renderWithMantine(
      <RadioField options={options} value={null} onChange={() => {}} disabled />,
    );
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => expect(radio).toBeDisabled());
  });

  it("renders description when provided", () => {
    renderWithMantine(
      <RadioField
        label="Contact"
        description="Choose your preference"
        options={options}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Choose your preference")).toBeInTheDocument();
  });
});
