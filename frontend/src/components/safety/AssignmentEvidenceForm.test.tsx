import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_MY_ASSIGNMENT } from "@/test/safetyFile";
import type { AssigneeStatus } from "@/lib/safety";
import AssignmentEvidenceForm from "./AssignmentEvidenceForm";

function renderForm() {
  const onSubmit = vi.fn<(status: AssigneeStatus, evidence: string) => void>();
  renderWithMantine(
    <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />,
  );

  return { onSubmit };
}

describe("AssignmentEvidenceForm", () => {
  it("names the mitigation, who asked and for which file", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: /^MIT-001: / })).toBeInTheDocument();
    expect(screen.getByText(/Asked by Dr Anita Patel/)).toBeInTheDocument();
  });

  it("saves the status and the evidence", async () => {
    const { onSubmit } = renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Implemented: in place" }));
    await userEvent.type(screen.getByLabelText(/Evidence/), "Tested on 7 November 2026.");
    await userEvent.click(screen.getByRole("button", { name: "Save evidence" }));

    expect(onSubmit).toHaveBeenCalledWith("implemented", "Tested on 7 November 2026.");
  });

  it("does not offer withdrawing the mitigation", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));

    expect(screen.queryByRole("option", { name: /withdrawn/i })).not.toBeInTheDocument();
  });
});
