import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import {
  SAMPLE_ASSIGNMENTS,
  SAMPLE_MEMBERS,
  SAMPLE_MITIGATIONS,
  FLAGGING_MITIGATION,
  SAMPLE_IT_LEAD,
} from "@/test/safetyFile";
import type { Mitigation } from "@/lib/safety";
import AssignMitigationForm from "./AssignMitigationForm";

const PROPOSED: Mitigation = {
  ...FLAGGING_MITIGATION,
  id: "MIT-002",
  title: "Daily safety-netting report",
  status: "proposed",
};

function renderForm(assignments = SAMPLE_ASSIGNMENTS) {
  const onSubmit = vi.fn<(mitigationId: string, assigneeId: string) => void>();
  renderWithMantine(
    <AssignMitigationForm
      mitigations={[...SAMPLE_MITIGATIONS, PROPOSED]}
      assignments={assignments}
      members={SAMPLE_MEMBERS}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit };
}

describe("AssignMitigationForm", () => {
  it("assigns a mitigation still to do to a member", async () => {
    const { onSubmit } = renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: "Mitigation" }));
    await userEvent.click(
      await screen.findByRole("option", {
        name: "MIT-002: Daily safety-netting report",
      }),
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Who" }));
    await userEvent.click(await screen.findByRole("option", { name: "Sam Rivers" }));
    await userEvent.click(screen.getByRole("button", { name: "Assign" }));

    expect(onSubmit).toHaveBeenCalledWith("MIT-002", SAMPLE_IT_LEAD.id);
  });

  it("offers neither a done mitigation nor one already out", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: "Mitigation" }));

    expect(screen.queryByRole("option", { name: /^MIT-001/ })).not.toBeInTheDocument();
  });

  it("will not assign until both are chosen", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Assign" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
