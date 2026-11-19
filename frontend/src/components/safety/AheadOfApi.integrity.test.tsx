import { describe, expect, it, vi } from "vitest";
import { renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine, renderWithRouter } from "@/test/test-utils";
import {
  SAMPLE_EXTRACTION,
  SAMPLE_PROCESS,
  assessment,
  samplePreview,
} from "@/test/safetyFile";
import type { RiskScore, SafetyFileStatus } from "@/lib/safety";
import DocumentTable from "./DocumentTable";
import ExtractionReview from "./ExtractionReview";
import NextStepCard from "./NextStepCard";
import ProcessStepTable from "./ProcessStepTable";
import SafetyDocumentSheet from "./SafetyDocumentSheet";
import SafetyStatusBadge from "./SafetyStatusBadge";
import { useAssessmentPreview } from "./useAssessmentPreview";

describe("ahead-of-API evidence presentation (TH-001/TH-008/TH-010/TH-011)", () => {
  it.each([
    { ...SAMPLE_PROCESS, next_step: null },
    { ...SAMPLE_PROCESS, next_step: "unknown-step" },
    { steps: [], next_step: null },
    {
      next_step: null,
      steps: SAMPLE_PROCESS.steps.map((step) => ({ ...step, done: true })),
    },
    { ...SAMPLE_PROCESS, steps: [SAMPLE_PROCESS.steps[0]!, SAMPLE_PROCESS.steps[0]!] },
    { ...SAMPLE_PROCESS, steps: [{ ...SAMPLE_PROCESS.steps[0]!, id: "" }] },
  ])("does not turn inconsistent process information into completion", (process) => {
    renderWithMantine(
      <NextStepCard
        process={process}
        onOpenGuide={vi.fn()}
        action={<button>Proceed</button>}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable|inconsistent/i);
    expect(screen.queryByText("Every step of the process is complete")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("retains an unsupported status without a normal approval badge", () => {
    renderWithMantine(<SafetyStatusBadge status={"archived" as SafetyFileStatus} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/archived/);
    expect(screen.queryByText("Accepted for go-live")).not.toBeInTheDocument();
  });

  it("keeps the complete source version and comment content in the document view", () => {
    const commit = "abcdef12" + "3".repeat(32);
    renderWithMantine(
      <SafetyDocumentSheet
        system="Fictional system"
        status="draft"
        commit={commit}
        text="Before <!-- a recorded qualification --> after."
      />,
    );
    expect(screen.getByText(`As at commit ${commit}`)).toBeInTheDocument();
    expect(screen.getByText(/a recorded qualification/)).toBeInTheDocument();
  });

  it.each([null, "abcdef12", "not-a-version"])(
    "warns when a document has no supported full source version: %s",
    (commit) => {
      renderWithMantine(
        <SafetyDocumentSheet
          system="Fictional system"
          status="accepted"
          commit={commit}
          text="Report"
        />,
      );
      expect(
        screen.getByRole("alert", { name: "Source version unavailable" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/^As at commit/)).not.toBeInTheDocument();
    },
  );

  it("shows every drafted narrative field and the raw scores for comparison", async () => {
    const row = {
      ...SAMPLE_EXTRACTION.rows[0]!,
      effect: "Specific effect retained",
      harm: "Specific harm retained",
      controls: "Specific supplier control retained",
    };
    renderWithMantine(
      <ExtractionReview
        extraction={{ ...SAMPLE_EXTRACTION, rows: [row] }}
        previewAssessment={samplePreview}
        rejected={new Set()}
        onToggleRow={vi.fn()}
        onColumnMapChange={vi.fn()}
      />,
    );
    expect(screen.getByText(SAMPLE_EXTRACTION.source, { exact: false })).toBeInTheDocument();
    for (const value of [row.effect, row.harm, row.controls])
      expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getByText(/Severity: 4; likelihood: 1/)).toBeInTheDocument();
    expect(screen.getByText(/not the original document/i)).toBeInTheDocument();
    await screen.findByRole("img", { name: /^Risk level/ });
  });

  it.each([99, -1, 0.5, NaN, "0" as unknown as number])(
    "keeps an unsupported recorded column visible until an explicit mapping change: %s",
    async (cause) => {
      const onColumnMapChange = vi.fn();
      renderWithMantine(
        <ExtractionReview
          extraction={{
            ...SAMPLE_EXTRACTION,
            column_map: { ...SAMPLE_EXTRACTION.column_map, cause },
            rows: [SAMPLE_EXTRACTION.rows[0]!],
          }}
          previewAssessment={samplePreview}
          rejected={new Set()}
          onToggleRow={vi.fn()}
          onColumnMapChange={onColumnMapChange}
        />,
      );
      const field = screen.getByRole("combobox", { name: "Cause" });
      expect(field).toHaveValue(`Unsupported column: ${String(cause)}`);
      expect(
        screen.getByText(
          `Recorded column ${String(cause)} is not available in the supplied table.`,
        ),
      ).toBeInTheDocument();
      expect(onColumnMapChange).not.toHaveBeenCalled();
      await userEvent.click(field);
      await userEvent.click(await screen.findByRole("option", { name: "None" }));
      expect(onColumnMapChange).toHaveBeenCalledExactlyOnceWith({
        ...SAMPLE_EXTRACTION.column_map,
        cause: null,
      });
      await screen.findByRole("img", { name: /^Risk level/ });
    },
  );

  it("does not show contradictory process requirements as a completed row", () => {
    renderWithRouter(
      <ProcessStepTable
        steps={[
          { ...SAMPLE_PROCESS.steps[0]!, done: true, reasons: ["Evidence still missing"] },
        ]}
      />,
    );
    expect(
      screen.getByText("A process step is marked done but still has outstanding requirements."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it.each([null, 0, 6, 2.5])(
    "reports missing/unsupported extracted scores without a request: %s",
    (severity) => {
      const preview = vi.fn(samplePreview);
      renderWithMantine(
        <ExtractionReview
          extraction={{
            ...SAMPLE_EXTRACTION,
            rows: [{ ...SAMPLE_EXTRACTION.rows[0]!, severity, problems: [] }],
          }}
          previewAssessment={preview}
          rejected={new Set()}
          onToggleRow={vi.fn()}
          onColumnMapChange={vi.fn()}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/scores.*missing or unsupported/i);
      expect(preview).not.toHaveBeenCalled();
    },
  );

  it("does not say an empty extraction proves there were no source hazards", () => {
    renderWithMantine(
      <ExtractionReview
        extraction={{ ...SAMPLE_EXTRACTION, rows: [] }}
        previewAssessment={samplePreview}
        rejected={new Set()}
        onToggleRow={vi.fn()}
        onColumnMapChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/does not establish.*no hazards/i);
  });

  it("warns when the supplied source cells do not cover the table's columns", async () => {
    renderWithMantine(
      <ExtractionReview
        extraction={{
          ...SAMPLE_EXTRACTION,
          rows: [{ ...SAMPLE_EXTRACTION.rows[0]!, cells: ["Only one supplied cell"] }],
        }}
        previewAssessment={samplePreview}
        rejected={new Set()}
        onToggleRow={vi.fn()}
        onColumnMapChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert", { name: "Source row incomplete" })).toHaveTextContent(
      "Supplied cells: 1",
    );
    expect(screen.getByText("Only one supplied cell", { exact: false })).toBeInTheDocument();
    await screen.findByRole("img", { name: /^Risk level/ });
  });

  it.each(["documents", "process"])(
    "distinguishes unavailable %s from an empty list",
    (kind) => {
      renderWithRouter(
        kind === "documents" ? (
          <DocumentTable documents={[]} error="Evidence unavailable" />
        ) : (
          <ProcessStepTable steps={[]} error="Evidence unavailable" />
        ),
      );
      expect(screen.getByText("Evidence unavailable")).toBeInTheDocument();
      expect(
        screen.queryByText(/No documents|No process steps|template has no process/),
      ).not.toBeInTheDocument();
    },
  );

  it("does not carry a preview across a changed preview source", async () => {
    const first = vi.fn(samplePreview);
    const pending = vi.fn(() => new Promise<ReturnType<typeof assessment>>(() => {}));
    const { result, rerender } = renderHook(
      ({ preview }) => useAssessmentPreview(4, 1, preview),
      { initialProps: { preview: first as typeof samplePreview } },
    );
    await waitFor(() => expect(result.current.state).toBe("ready"));
    rerender({ preview: pending });
    expect(result.current.state).toBe("working");
  });

  it("refuses unsupported scores at the shared preview boundary", () => {
    const preview = vi.fn(samplePreview);
    const { result } = renderHook(() => useAssessmentPreview(6 as RiskScore, 1, preview));
    expect(result.current.state).toBe("failed");
    expect(preview).not.toHaveBeenCalled();
  });
});
