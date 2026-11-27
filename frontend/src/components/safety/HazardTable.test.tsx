/**
 * HazardTable Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { MITIGATED_HAZARD, SAMPLE_HAZARDS } from "@/test/safetyFile";
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
      /^S\d L\d\s*4\s*Mandatory elimination$/,
    );
    expect(
      first.getByLabelText(/^Risk level 2, Acceptable if cost of reduction exceeds benefit/),
    ).toHaveTextContent(/^S\d L\d\s*2\s*Acceptable if cost of reduction exceeds benefit$/);
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

  it("shows each level with the scores it came from and its words", () => {
    // As the safety file page's hazard log always has: a reader sees
    // what each level was derived from without opening the hazard.
    renderWithRouter(<HazardTable hazards={[MITIGATED_HAZARD]} />);
    const row = screen.getAllByRole("row")[1];
    const { initial, residual } = MITIGATED_HAZARD;

    expect(row).toHaveTextContent(`S${initial.severity} L${initial.likelihood}`);
    expect(row).toHaveTextContent(initial.risk_label);
    expect(row).toHaveTextContent(`S${residual.severity} L${residual.likelihood}`);
    expect(row).toHaveTextContent(residual.risk_label);
  });

  it("searches the harm as well as the reference, title and cause", async () => {
    renderWithRouter(<HazardTable hazards={SAMPLE_HAZARDS} />);
    const [first, ...others] = SAMPLE_HAZARDS;
    if (!first) throw new Error("No sample hazards");

    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), first.harm);

    expect(screen.getByText(first.title)).toBeInTheDocument();
    for (const other of others.filter((hazard) => hazard.harm !== first.harm)) {
      expect(screen.queryByText(other.title)).not.toBeInTheDocument();
    }
  });

  it("names the table by its label for a screen reader, when given one", () => {
    renderWithRouter(
      <HazardTable hazards={SAMPLE_HAZARDS} label="Hazards recorded in this safety file" />,
    );

    expect(
      screen.getByRole("table", { name: "Hazards recorded in this safety file" }),
    ).toBeInTheDocument();
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
