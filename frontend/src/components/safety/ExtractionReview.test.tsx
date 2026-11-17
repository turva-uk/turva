/**
 * ExtractionReview tests.
 */

import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_EXTRACTION, samplePreview } from "@/test/safetyFile";
import type { ColumnMap } from "@/lib/safety";
import ExtractionReview from "./ExtractionReview";
import type { PreviewAssessment } from "./useAssessmentPreview";

function renderReview(overrides: Partial<Parameters<typeof ExtractionReview>[0]> = {}) {
  const onToggleRow = vi.fn<(row: number) => void>();
  const onColumnMapChange = vi.fn<(columnMap: ColumnMap) => void>();

  renderWithMantine(
    <ExtractionReview
      extraction={SAMPLE_EXTRACTION}
      previewAssessment={samplePreview}
      rejected={new Set()}
      onToggleRow={onToggleRow}
      onColumnMapChange={onColumnMapChange}
      {...overrides}
    />,
  );

  return { onToggleRow, onColumnMapChange };
}

describe("ExtractionReview", () => {
  it("shows each row's cells beside the hazard drafted from it", () => {
    renderReview();
    const row = screen.getByTestId("extraction-row-1");

    expect(within(row).getByText("In the supplier's document")).toBeVisible();
    expect(within(row).getByText("Drafted hazard")).toBeVisible();
    expect(within(row).getAllByText(/The API returns an incorrect centile/)).toHaveLength(2);
    expect(within(row).getByText("Supplier's reference: dGC-49")).toBeInTheDocument();
  });

  it("gives the level the server derives, as number and word", async () => {
    renderReview();
    const row = screen.getByTestId("extraction-row-1");

    expect(
      await within(row).findByRole("img", {
        name: /^Risk level 2, Acceptable if cost of reduction exceeds benefit/,
      }),
    ).toHaveTextContent(/^2\s*Acceptable if cost of reduction exceeds benefit$/);
  });

  it("asks the server for a row's level, and not for a row without both scores", async () => {
    const preview = vi.fn<PreviewAssessment>(samplePreview);
    renderReview({ previewAssessment: preview });

    await screen.findByRole("img", { name: /^Risk level 2,/ });
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenCalledWith(4, 1, expect.any(AbortSignal));
    expect(
      within(screen.getByTestId("extraction-row-2")).queryByRole("img", {
        name: /^Risk level/,
      }),
    ).not.toBeInTheDocument();
  });

  it("says so when the server cannot be asked", async () => {
    renderReview({ previewAssessment: () => Promise.reject(new Error("offline")) });

    expect(
      await screen.findByText("Turva could not work out the risk level just now."),
    ).toBeInTheDocument();
  });

  it("says why a row cannot be read", () => {
    renderReview();
    const row = screen.getByTestId("extraction-row-2");

    expect(within(row).getByText("Cannot read: no severity")).toBeInTheDocument();
  });

  it("ticks a row off as not a hazard", async () => {
    const { onToggleRow } = renderReview();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Row 2 is not a hazard: leave it out",
      }),
    );

    expect(onToggleRow).toHaveBeenCalledWith(2);
  });

  it("shows a rejected row as left out", () => {
    renderReview({ rejected: new Set([2]) });
    const row = screen.getByTestId("extraction-row-2");

    expect(within(row).getByText("Left out")).toBeVisible();
    expect(within(row).queryByText("Cannot read: no severity")).not.toBeInTheDocument();
  });

  it("changes which column feeds a field", async () => {
    const { onColumnMapChange } = renderReview();

    await userEvent.click(screen.getByRole("combobox", { name: "Cause" }));
    await userEvent.click(await screen.findByRole("option", { name: "None" }));

    expect(onColumnMapChange).toHaveBeenCalledWith({
      ...SAMPLE_EXTRACTION.column_map,
      cause: null,
    });
  });
});
