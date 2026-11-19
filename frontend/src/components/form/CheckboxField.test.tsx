import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import CheckboxField from "./CheckboxField";
import classes from "./CheckboxField.module.css";

describe("CheckboxField", () => {
  it("pads the tappable label and moves the box with it on phones", () => {
    const { container } = renderWithMantine(
      <CheckboxField label="I confirm this declaration" />,
    );
    expect(container.querySelector("label")).toHaveClass(
      classes.label ?? "missing-css-module-class",
    );
    expect(container.querySelector(".mantine-Checkbox-inner")).toHaveClass(
      classes.inner ?? "missing-css-module-class",
    );
  });
  it("renders with a label", () => {
    renderWithMantine(<CheckboxField label="I confirm this declaration" />);
    expect(screen.getByLabelText(/I confirm this declaration/)).toBeInTheDocument();
  });

  it("renders a description carrying the wording being agreed to", () => {
    renderWithMantine(
      <CheckboxField
        label="I confirm this declaration"
        description="I accept professional accountability for this judgement."
      />,
    );
    expect(
      screen.getByText("I accept professional accountability for this judgement."),
    ).toBeInTheDocument();
  });

  it("renders an error message", () => {
    renderWithMantine(
      <CheckboxField
        label="I confirm this declaration"
        error="You must confirm the declaration before signing"
      />,
    );
    expect(
      screen.getByText("You must confirm the declaration before signing"),
    ).toBeInTheDocument();
  });

  describe("The deliberate act", () => {
    it("is unticked unless the caller says otherwise", () => {
      // A box that arrives already ticked records nothing about what the
      // person meant to do.
      renderWithMantine(<CheckboxField label="I confirm this declaration" />);
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("reports the tick to the caller", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderWithMantine(
        <CheckboxField label="I confirm this declaration" onChange={onChange} />,
      );
      await user.click(screen.getByRole("checkbox"));

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("reflects a controlled checked state", () => {
      renderWithMantine(
        <CheckboxField label="I confirm this declaration" checked onChange={() => {}} />,
      );
      expect(screen.getByRole("checkbox")).toBeChecked();
    });
  });

  it("can be required", () => {
    renderWithMantine(<CheckboxField label="I confirm this declaration" required />);
    expect(screen.getByRole("checkbox")).toBeRequired();
  });

  it("can be disabled", () => {
    renderWithMantine(<CheckboxField label="I confirm this declaration" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
