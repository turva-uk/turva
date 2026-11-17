import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_HAZARDS } from "@/test/safetyFile";
import type { WorkshopFormProps } from "./WorkshopForm";
import WorkshopForm from "./WorkshopForm";

function renderForm(props: Partial<WorkshopFormProps> = {}) {
  const onSubmit = vi.fn<WorkshopFormProps["onSubmit"]>();
  const onCancel = vi.fn<WorkshopFormProps["onCancel"]>();
  renderWithMantine(
    <WorkshopForm
      hazards={SAMPLE_HAZARDS}
      today="2026-11-07"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );

  return { onSubmit, onCancel };
}

describe("WorkshopForm", () => {
  it("sends the attendees one per line", async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(
      screen.getByLabelText(/Attendees/),
      "Dr Anita Patel, CSO{enter}Joseph Okafor, practice manager",
    );
    await userEvent.click(screen.getByRole("button", { name: "Record workshop" }));

    expect(onSubmit).toHaveBeenCalledWith({
      held_on: "2026-11-07",
      attendees: ["Dr Anita Patel, CSO", "Joseph Okafor, practice manager"],
      hazards: [],
      notes: "",
    });
  });

  it("refuses a workshop with nobody at it", async () => {
    const { onSubmit } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Record workshop" }));

    expect(screen.getByText("Name at least one person who attended.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error from the save", () => {
    renderForm({ error: "Somebody else saved this file" });

    expect(screen.getByText("Somebody else saved this file")).toBeInTheDocument();
  });
});
