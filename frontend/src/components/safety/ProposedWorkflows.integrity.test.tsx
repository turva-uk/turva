import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithMantine, renderWithRouter } from "@/test/test-utils";
import {
  FLAGGING_MITIGATION,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_EXTRAS,
  SAMPLE_EXTRAS_FOR_CSO,
  SAMPLE_HAZARDS,
  SAMPLE_HEAD,
  SAMPLE_MEMBERS,
  SAMPLE_MY_ASSIGNMENT,
  SAMPLE_POSTS,
} from "@/test/safetyFile";
import type { SafetyFileExtras } from "@/lib/safety";
import AssignmentEvidenceForm from "./AssignmentEvidenceForm";
import AssignmentTable from "./AssignmentTable";
import AssignMitigationForm from "./AssignMitigationForm";
import OfficerList from "./OfficerList";
import SignOffPanel from "./SignOffPanel";
import WorkshopForm from "./WorkshopForm";

const PROPOSED = { ...FLAGGING_MITIGATION, status: "proposed" };

describe("proposed workflow boundaries (TH-001/TH-004/TH-005/TH-009)", () => {
  it("does not treat a supplied registration-verified flag as a professional-register check", () => {
    renderWithMantine(
      <OfficerList posts={[{ ...SAMPLE_POSTS[0]!, registration_verified: true }]} />,
    );
    expect(screen.getByText("GMC 7654321, not verified")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /does not check professional registers/i,
    );
  });

  it("does not turn an incomplete holder identity into a vacant post", () => {
    renderWithMantine(<OfficerList posts={[{ ...SAMPLE_POSTS[0]!, holder_name: null }]} />);
    expect(screen.queryByText("Vacant")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/holder.*unavailable/i);
  });

  it("does not replace missing sign-off information with a claim that nothing was signed", () => {
    renderWithMantine(
      <SignOffPanel file={SAMPLE_EXTRAS} head={SAMPLE_HEAD} onSign={vi.fn()} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/sign-off information.*unavailable/i);
    expect(screen.queryByText("Not yet signed.")).not.toBeInTheDocument();
  });

  it.each([null, "short-head"])(
    "refuses a sign-off proposal without a full opened version: %s",
    (head) => {
      renderWithMantine(
        <SignOffPanel file={SAMPLE_EXTRAS_FOR_CSO} head={head} onSign={vi.fn()} />,
      );
      expect(
        screen.queryByRole("button", { name: "Approve the safety case" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/source version/i);
    },
  );

  it("sends the version displayed when the sign-off confirmation opened", async () => {
    const onSign = vi.fn().mockResolvedValue(undefined);
    renderWithMantine(
      <SignOffPanel file={SAMPLE_EXTRAS_FOR_CSO} head={SAMPLE_HEAD} onSign={onSign} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Approve the safety case" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(SAMPLE_HEAD);
    await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(onSign).toHaveBeenCalledExactlyOnceWith("approved", "123456", SAMPLE_HEAD),
    );
  });

  it.each(["version", "file", "permission", "handler"])(
    "does not rebind an open confirmation after a changed %s",
    async (changed) => {
      const onSign = vi.fn().mockResolvedValue(undefined);
      const replacement = vi.fn().mockResolvedValue(undefined);
      const props = { file: SAMPLE_EXTRAS_FOR_CSO, head: SAMPLE_HEAD, onSign };
      const { rerender } = renderWithMantine(<SignOffPanel {...props} />);
      await userEvent.click(screen.getByRole("button", { name: "Approve the safety case" }));
      await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
      rerender(
        <SignOffPanel
          {...props}
          head={changed === "version" ? "b".repeat(40) : SAMPLE_HEAD}
          file={
            changed === "file"
              ? {
                  ...props.file,
                  safety_file: { ...props.file.safety_file, slug: "another-file" },
                }
              : changed === "permission"
                ? { ...props.file, sign_offs: { ...props.file.sign_offs!, can_approve: false } }
                : props.file
          }
          onSign={changed === "handler" ? replacement : onSign}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Approve" }));
      expect(onSign).not.toHaveBeenCalled();
      expect(replacement).not.toHaveBeenCalled();
      expect(await screen.findByText(/confirmation context has changed/i)).toBeInTheDocument();
    },
  );

  it("does not revive an open confirmation when a revoked permission returns", async () => {
    const onSign = vi.fn().mockResolvedValue(undefined);
    const props = { file: SAMPLE_EXTRAS_FOR_CSO, head: SAMPLE_HEAD, onSign };
    const { rerender } = renderWithMantine(<SignOffPanel {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Approve the safety case" }));
    await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
    rerender(
      <SignOffPanel
        {...props}
        file={{ ...props.file, sign_offs: { ...props.file.sign_offs!, can_approve: false } }}
      />,
    );
    rerender(<SignOffPanel {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onSign).not.toHaveBeenCalled();
    expect(await screen.findByText(/confirmation context has changed/i)).toBeInTheDocument();
  });

  it("retains a pending sign-off request gate when its context changes", async () => {
    let finish!: () => void;
    const onSign = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const props = { file: SAMPLE_EXTRAS_FOR_CSO, head: SAMPLE_HEAD, onSign };
    const { rerender } = renderWithMantine(<SignOffPanel {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Approve the safety case" }));
    await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(onSign).toHaveBeenCalledTimes(1));
    rerender(<SignOffPanel {...props} head={"c".repeat(40)} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onSign).toHaveBeenCalledExactlyOnceWith("approved", "123456", SAMPLE_HEAD);
    await act(async () => finish());
  });

  it("retains every supplied sign-off reference without inferring its chronology or signer", () => {
    const tags = ["approved/2026-2-01", "approved/2026-11-07"];
    const file: SafetyFileExtras = {
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "approved",
      sign_offs: { ...SAMPLE_EXTRAS_FOR_CSO.sign_offs!, can_approve: false, tags },
    };
    renderWithMantine(<SignOffPanel file={file} head={SAMPLE_HEAD} onSign={vi.fn()} />);
    for (const tag of tags) expect(screen.getByText(tag, { exact: true })).toBeInTheDocument();
    expect(
      screen.queryByText(/Signed for the file as it stands|Last signed as/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/tag names do not establish/i)).toBeInTheDocument();
  });

  it.each(["withdrawn", "unknown-status", "verified"])(
    "retains an unsupported assignee status read-only: %s",
    async (status) => {
      const onSubmit = vi.fn();
      renderWithMantine(
        <AssignmentEvidenceForm
          assignment={{
            ...SAMPLE_MY_ASSIGNMENT,
            mitigation: {
              ...SAMPLE_MY_ASSIGNMENT.mitigation,
              status,
              evidence: "Recorded implementation statement",
            },
          }}
          onSubmit={onSubmit}
        />,
      );
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue(status);
      expect(screen.getByLabelText("Evidence")).toHaveValue(
        "Recorded implementation statement",
      );
      expect(screen.getByLabelText("Evidence")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("Evidence")).not.toBeDisabled();
      await userEvent.click(screen.getByRole("button", { name: "Save evidence" }));
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("does not offer a delegate independent clinical verification authority", async () => {
    renderWithMantine(
      <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    expect(screen.queryByRole("option", { name: /^Verified/ })).not.toBeInTheDocument();
  });

  it("requires an evidence statement before sending an implemented mitigation", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(screen.getByRole("option", { name: "Implemented: in place" }));
    await userEvent.click(screen.getByRole("button", { name: "Save evidence" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Evidence")).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps an evidence draft and its opened identity together until a deliberate remount", async () => {
    const onSubmit = vi.fn();
    const { rerender } = renderWithMantine(
      <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText("Evidence"), "Retained draft");
    rerender(
      <AssignmentEvidenceForm
        assignment={{
          ...SAMPLE_MY_ASSIGNMENT,
          id: "another-assignment",
          file_name: "Another file",
          head_sha: "d".repeat(40),
          mitigation: { ...SAMPLE_MY_ASSIGNMENT.mitigation, title: "Another mitigation" },
        }}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("heading")).not.toHaveTextContent("Another mitigation");
    expect(screen.getByLabelText("Evidence")).toHaveValue("Retained draft");
    expect(screen.getByRole("alert")).toHaveTextContent(/opened assignment/i);
    await userEvent.click(screen.getByRole("button", { name: "Save evidence" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(["evidence", "workshop"])(
    "blocks pending changes, cancellation and native submission for %s",
    async (kind) => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      renderWithMantine(
        kind === "evidence" ? (
          <AssignmentEvidenceForm
            assignment={SAMPLE_MY_ASSIGNMENT}
            onSubmit={onSubmit}
            onCancel={onCancel}
            saving
          />
        ) : (
          <WorkshopForm
            hazards={SAMPLE_HAZARDS}
            today="2026-11-07"
            onSubmit={onSubmit}
            onCancel={onCancel}
            saving
          />
        ),
      );
      const text = screen.getByLabelText(kind === "evidence" ? "Evidence" : /Attendees/);
      expect(text).toHaveAttribute("readonly");
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.submit(screen.getByRole("form"));
      expect(onCancel).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("does not offer mitigations with an unknown recorded status for assignment", async () => {
    renderWithMantine(
      <AssignMitigationForm
        mitigations={[PROPOSED, { ...PROPOSED, id: "MIT-UNKNOWN", status: "unknown-status" }]}
        assignments={[]}
        members={SAMPLE_MEMBERS}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Mitigation" }));
    expect(screen.queryByRole("option", { name: /^MIT-UNKNOWN/ })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported.*status/i);
  });

  it.each(["member", "assigned", "status", "title", "name"])(
    "retains but refuses a now-unavailable assignment selection: %s",
    async (changed) => {
      const onSubmit = vi.fn();
      const props = {
        mitigations: [PROPOSED],
        assignments: [],
        members: SAMPLE_MEMBERS,
        onSubmit,
      };
      const { rerender } = renderWithMantine(<AssignMitigationForm {...props} />);
      await userEvent.click(screen.getByRole("combobox", { name: "Mitigation" }));
      await userEvent.click(
        screen.getByRole("option", { name: new RegExp(`^${PROPOSED.id}:`) }),
      );
      await userEvent.click(screen.getByRole("combobox", { name: "Who" }));
      await userEvent.click(screen.getByRole("option", { name: "Sam Rivers" }));
      rerender(
        <AssignMitigationForm
          {...props}
          members={
            changed === "member"
              ? []
              : changed === "name"
                ? props.members.map((item) => ({ ...item, name: `Changed ${item.name}` }))
                : props.members
          }
          assignments={changed === "assigned" ? SAMPLE_ASSIGNMENTS : []}
          mitigations={
            changed === "status"
              ? [{ ...PROPOSED, status: "implemented" }]
              : changed === "title"
                ? [{ ...PROPOSED, title: "Changed mitigation title" }]
                : props.mitigations
          }
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/selected.*unavailable/i);
      expect(screen.getByText(`Selected: ${PROPOSED.id}: ${PROPOSED.title}`)).toBeVisible();
      expect(screen.getByText("Selected: Sam Rivers")).toBeVisible();
      fireEvent.submit(screen.getByRole("form"));
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("does not clear assignment selections during a pending request", async () => {
    const props = {
      mitigations: [PROPOSED],
      assignments: [],
      members: SAMPLE_MEMBERS,
      onSubmit: vi.fn(),
    };
    const { rerender } = renderWithMantine(<AssignMitigationForm {...props} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Mitigation" }));
    await userEvent.click(screen.getByRole("option", { name: new RegExp(`^${PROPOSED.id}:`) }));
    rerender(<AssignMitigationForm {...props} saving />);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("combobox", { name: "Mitigation" })).toHaveValue(
      `${PROPOSED.id}: ${PROPOSED.title}`,
    );
    expect(screen.getByRole("combobox", { name: "Mitigation" })).toHaveAccessibleDescription(
      `Selected: ${PROPOSED.id}: ${PROPOSED.title}`,
    );
  });

  it("does not submit a non-canonical workshop date", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <WorkshopForm hazards={[]} today="2026-02-30" onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    await userEvent.type(screen.getByLabelText(/Attendees/), "Fictional officer");
    await userEvent.click(screen.getByRole("button", { name: "Record workshop" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Held on/)).toHaveAttribute("aria-invalid", "true");
  });

  it("associates the missing workshop attendees error with its field", async () => {
    renderWithMantine(
      <WorkshopForm hazards={[]} today="2026-11-07" onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Record workshop" }));
    expect(screen.getByLabelText(/Attendees/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Attendees/)).toHaveAccessibleDescription(/Name at least one/);
  });

  it("does not disguise unavailable assignments as an empty successful list", () => {
    renderWithRouter(
      <AssignmentTable assignments={[]} error="Assignments could not be read" />,
    );
    expect(screen.getByText("Assignments could not be read")).toBeInTheDocument();
    expect(screen.queryByText("No mitigation is out with anybody.")).not.toBeInTheDocument();
  });

  it.each(["evidence", "workshop"])(
    "revokes native submission without discarding the %s draft",
    async (kind) => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      const render = (readOnly: boolean) =>
        kind === "evidence" ? (
          <AssignmentEvidenceForm
            assignment={SAMPLE_MY_ASSIGNMENT}
            onSubmit={onSubmit}
            onCancel={onCancel}
            readOnly={readOnly}
          />
        ) : (
          <WorkshopForm
            hazards={SAMPLE_HAZARDS}
            today="2026-11-07"
            onSubmit={onSubmit}
            onCancel={onCancel}
            readOnly={readOnly}
          />
        );
      const { rerender } = renderWithMantine(render(false));
      const name = kind === "evidence" ? "Evidence" : /Attendees/;
      await userEvent.type(screen.getByLabelText(name), "Retained proposed evidence");
      rerender(render(true));
      expect(screen.getByLabelText(name)).toHaveValue("Retained proposed evidence");
      expect(screen.getByLabelText(name)).toHaveAttribute("readonly");
      expect(screen.getByLabelText(name)).not.toBeDisabled();
      fireEvent.submit(screen.getByRole("form"));
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("does not reattach an evidence draft after the incoming record changes back", async () => {
    const onSubmit = vi.fn();
    const { rerender } = renderWithMantine(
      <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText("Evidence"), "Opened draft");
    rerender(
      <AssignmentEvidenceForm
        assignment={{ ...SAMPLE_MY_ASSIGNMENT, head_sha: "f".repeat(40) }}
        onSubmit={onSubmit}
      />,
    );
    rerender(<AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Evidence")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Evidence")).toHaveValue("Opened draft");
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("retains unavailable selected workshop hazards and refuses a native submit", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const props = { hazards: SAMPLE_HAZARDS, today: "2026-11-07", onSubmit, onCancel };
    const { rerender } = renderWithMantine(<WorkshopForm {...props} />);
    await userEvent.type(screen.getByLabelText(/Attendees/), "Fictional officer");
    await userEvent.click(screen.getByRole("combobox", { name: "Hazards it raised" }));
    await userEvent.click(
      screen.getByRole("option", { name: new RegExp(`^${SAMPLE_HAZARDS[0]!.id}:`) }),
    );
    rerender(<WorkshopForm {...props} hazards={[]} />);
    expect(
      screen.getByRole("alert", { name: "Selected hazards unavailable" }),
    ).toBeInTheDocument();
    const selected = screen
      .getAllByText(`${SAMPLE_HAZARDS[0]!.id}: unavailable`)
      .find((label) => !label.closest('[role="listbox"]'));
    expect(selected).toBeVisible();
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("combobox", { name: "Hazards it raised" }));
    await userEvent.keyboard("{Backspace}");
    expect(
      screen.queryByRole("alert", { name: "Selected hazards unavailable" }),
    ).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      held_on: "2026-11-07",
      attendees: ["Fictional officer"],
      hazards: [],
      notes: "",
    });
  });

  it("uses native evidence submission with the opened version and unmodified narrative", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <AssignmentEvidenceForm assignment={SAMPLE_MY_ASSIGNMENT} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByLabelText("Evidence"), "First line{Enter}Second line");
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      "proposed",
      "First line\nSecond line",
      SAMPLE_HEAD,
    );
  });

  it.each([
    { ...SAMPLE_EXTRAS_FOR_CSO, status: "unknown" as SafetyFileExtras["status"] },
    {
      ...SAMPLE_EXTRAS_FOR_CSO,
      sign_offs: { ...SAMPLE_EXTRAS_FOR_CSO.sign_offs!, can_accept: true },
    },
    { ...SAMPLE_EXTRAS_FOR_CSO, posts: [] },
    {
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "accepted" as const,
      sign_offs: { ...SAMPLE_EXTRAS_FOR_CSO.sign_offs!, can_approve: false },
    },
  ])("does not offer sign-off actions for contradictory reported context", (file) => {
    renderWithMantine(<SignOffPanel file={file} head={SAMPLE_HEAD} onSign={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve the safety case" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept the residual risk" }),
    ).not.toBeInTheDocument();
  });

  it("distinguishes unavailable safety posts from an empty supplied list", () => {
    renderWithMantine(<OfficerList posts={[]} error="Safety posts could not be read" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Safety posts could not be read");
    expect(screen.queryByText("Vacant")).not.toBeInTheDocument();
    expect(screen.queryByText("No safety posts were supplied.")).not.toBeInTheDocument();
  });

  it("renders assignment instants in UTC while retaining the full source timestamp", () => {
    const assigned_at = "2026-11-07T00:30:00+02:00";
    renderWithRouter(
      <AssignmentTable assignments={[{ ...SAMPLE_ASSIGNMENTS[0]!, assigned_at }]} />,
    );
    const instant = screen.getByText(/6 November 2026/);
    expect(instant).toHaveTextContent("22:30");
    expect(instant).toHaveAttribute("datetime", assigned_at);
    expect(instant).toHaveAttribute("title", assigned_at);
  });

  it("retains an unsupported assignment timestamp without displaying a plausible date", () => {
    renderWithRouter(
      <AssignmentTable
        assignments={[{ ...SAMPLE_ASSIGNMENTS[0]!, assigned_at: "unsupported-timestamp" }]}
      />,
    );
    expect(
      screen.getByText(/Assignment time unavailable.*unsupported-timestamp/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });
});
