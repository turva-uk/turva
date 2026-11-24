/**
 * MitigationForm Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { blankMitigation } from "@/lib/safety";
import { renderWithMantine } from "@/test/test-utils";
import {
  FLAGGING_MITIGATION,
  SAMPLE_HAZARDS,
  SAMPLE_MITIGATION_OPTIONS,
} from "@/test/safetyFile";

import MitigationForm from "./MitigationForm";

function renderForm(props: Partial<Parameters<typeof MitigationForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  renderWithMantine(
    <MitigationForm
      hazards={SAMPLE_HAZARDS}
      options={SAMPLE_MITIGATION_OPTIONS}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );

  return { onSubmit, onCancel };
}

async function choose(name: string, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("MitigationForm", () => {
  it("assumes no control type, and saves only once the required fields are given", async () => {
    const { onSubmit } = renderForm({ initial: blankMitigation("cso@example.test") });

    expect(screen.getByRole("combobox", { name: "Control type" })).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alert", { name: "Mitigation validation problems" }),
    ).toHaveTextContent("Choose a control type.");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Mitigation title" }),
      "Fictional control",
    );
    await choose("Control type", "Technical");
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      title: "Fictional control",
      status: "proposed",
      owner: "cso@example.test",
      control_type: "technical",
      hazards: [],
      evidence: "",
      body: "",
    });
  });

  it("hands back only the write fields: no version, no record fields and no risk level", async () => {
    const { onSubmit } = renderForm({ initial: FLAGGING_MITIGATION });

    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(onSubmit.mock.calls[0])).not.toMatch(
      /expected_head|risk_level|risk_label|"id"|created|updated/,
    );
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      control_type: FLAGGING_MITIGATION.control_type,
      hazards: FLAGGING_MITIGATION.hazards,
    });
  });

  it("requires evidence once a control is implemented or verified", async () => {
    const { onSubmit } = renderForm({ initial: { ...FLAGGING_MITIGATION, evidence: "" } });

    expect(
      screen.getByRole("textbox", { name: "Implementation and verification evidence" }),
    ).toBeRequired();
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(
        "A mitigation marked implemented needs implementation and verification evidence.",
      ).length,
    ).toBeGreaterThan(0);

    await choose("Mitigation status", "Proposed");
    expect(
      screen.getByRole("textbox", { name: "Implementation and verification evidence" }),
    ).not.toBeRequired();
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("names the hazards a new mitigation starts linked to", async () => {
    const { onSubmit } = renderForm({
      initial: { ...blankMitigation("cso@example.test", ["HAZ-002"]), title: "Fictional" },
    });

    await choose("Control type", "Procedural");
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ hazards: ["HAZ-002"] });
  });

  it("keeps a link to a hazard not in the list rather than dropping it", async () => {
    const { onSubmit } = renderForm({
      initial: { ...FLAGGING_MITIGATION, hazards: ["HAZ-001", "HAZ-099"] },
    });

    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));

    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ hazards: ["HAZ-001", "HAZ-099"] });
  });

  it("says a mitigation's status never changes risk", () => {
    renderForm();

    expect(screen.getByText("Mitigation status does not change risk")).toBeInTheDocument();
  });

  it("shows the server's message under the field it names", () => {
    renderForm({
      initial: FLAGGING_MITIGATION,
      fieldErrors: { owner: "Enter a valid email address." },
    });

    const owner = screen.getByRole("textbox", { name: "Responsible email address" });
    expect(owner).toHaveAccessibleDescription(/Enter a valid email address\./);
  });

  it("opens a record with a status Turva does not know read only, keeping it", () => {
    const { onSubmit } = renderForm({
      initial: { ...FLAGGING_MITIGATION, status: "under review" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Read-only mitigation");
    expect(screen.getByRole("textbox", { name: "Recorded status" })).toHaveValue(
      "under review",
    );
    expect(screen.queryByRole("button", { name: "Save mitigation" })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the draft and saves nothing once editing is revoked", async () => {
    const { onSubmit } = renderForm({ initial: FLAGGING_MITIGATION, readOnly: true });

    const title = screen.getByRole("textbox", { name: "Mitigation title" });
    await userEvent.type(title, " unwanted");
    expect(title).toHaveValue(FLAGGING_MITIGATION.title);
    await userEvent.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not save twice while a save is under way", async () => {
    const { onSubmit } = renderForm({ initial: FLAGGING_MITIGATION, saving: true });

    const form = screen.getByRole("button", { name: "Save mitigation" }).closest("form");
    if (!form) throw new Error("No form");
    form.requestSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(within(form).getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
