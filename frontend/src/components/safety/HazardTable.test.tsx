/**
 * HazardTable Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_HAZARDS } from "@/test/safetyFile";
import HazardTable from "./HazardTable";

describe("HazardTable", () => {
  it("lists each hazard with its derived levels", () => {
    renderWithRouter(<HazardTable hazards={SAMPLE_HAZARDS} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(SAMPLE_HAZARDS.length);

    const [firstRow] = rows;
    if (!firstRow) throw new Error("The table has no rows");
    expect(firstRow).toHaveTextContent("HAZ-001");
    const first = within(firstRow);
    expect(first.getByLabelText(/^Risk level 4, Mandatory elimination/)).toHaveTextContent(
      /^4$/,
    );
    expect(
      first.getByLabelText(/^Risk level 2, Acceptable if cost of reduction exceeds benefit/),
    ).toHaveTextContent(/^2$/);
  });

  it("shows where each hazard stands, a closed one included", () => {
    renderWithRouter(<HazardTable hazards={SAMPLE_HAZARDS} />);

    expect(screen.getAllByText("Open")).toHaveLength(2);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows a status Turva does not know as it came, not as another", () => {
    const [hazard] = SAMPLE_HAZARDS;
    if (!hazard) throw new Error("No sample hazard");
    renderWithRouter(<HazardTable hazards={[{ ...hazard, status: "under review" }]} />);

    expect(screen.getByText("under review")).toBeInTheDocument();
    expect(screen.queryByText("Open")).not.toBeInTheDocument();
  });

  it("shows each level as its number alone, so the other columns keep their room", () => {
    // A level's words run to "Acceptable if cost of reduction exceeds
    // benefit", and two of those in a row squeezed Ref, Hazard and Cause.
    renderWithRouter(<HazardTable hazards={SAMPLE_HAZARDS} />);
    const rows = screen.getAllByRole("row").slice(1);

    expect(rows[0]).not.toHaveTextContent("Mandatory elimination");
    expect(rows[0]).not.toHaveTextContent("Acceptable if cost");
  });

  it("says an empty log is not evidence of safety", () => {
    renderWithRouter(<HazardTable hazards={[]} />);
    expect(
      screen.getByText(/An empty hazard log is not evidence of a safe system/),
    ).toBeInTheDocument();
  });

  it("reports the hazard chosen", async () => {
    const onSelect = vi.fn();
    renderWithRouter(<HazardTable hazards={SAMPLE_HAZARDS} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Reading attributed to the wrong patient"));
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_HAZARDS[1]);
  });
});
