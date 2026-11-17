/**
 * SafetyCaseTable Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import SafetyCaseTable from "./SafetyCaseTable";
import { SAMPLE_FILES } from "@/test/safetyFile";

describe("SafetyCaseTable", () => {
  it("lists every file in the order given", () => {
    renderWithRouter(<SafetyCaseTable cases={SAMPLE_FILES} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("BP@Home remote blood pressure monitoring");
    expect(rows[1]).toHaveTextContent("Digital growth charts");
  });

  it("shows the organisation, standard, visibility and date made", () => {
    const [, growthCharts] = SAMPLE_FILES;
    if (!growthCharts) throw new Error("No second sample file");
    renderWithRouter(<SafetyCaseTable cases={[growthCharts]} />);
    expect(screen.getByText("Riverbank Health Federation")).toBeInTheDocument();
    expect(screen.getByText("DCB0160")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Created/ })).toBeInTheDocument();
  });

  it("has no status column, which Turva's files do not carry yet", () => {
    renderWithRouter(<SafetyCaseTable cases={SAMPLE_FILES} />);
    expect(screen.queryByRole("columnheader", { name: /Status/ })).not.toBeInTheDocument();
  });

  it("says so when there are none", () => {
    renderWithRouter(<SafetyCaseTable cases={[]} />);
    expect(screen.getByText("No safety files yet")).toBeInTheDocument();
  });

  it("reports the file chosen", async () => {
    const onSelect = vi.fn();
    renderWithRouter(<SafetyCaseTable cases={SAMPLE_FILES} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Digital growth charts"));
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_FILES[1]);
  });

  it("shows the action given in the row above the table", () => {
    renderWithRouter(
      <SafetyCaseTable
        cases={SAMPLE_FILES}
        action={<button type="button">Add safety file</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add safety file" })).toBeInTheDocument();
  });

  it("narrows the rows to a search", async () => {
    renderWithRouter(<SafetyCaseTable cases={SAMPLE_FILES} />);
    await userEvent.click(screen.getByLabelText("Open search"));
    await userEvent.type(screen.getByLabelText("Search"), "growth");
    expect(screen.getByText("Digital growth charts")).toBeInTheDocument();
    expect(
      screen.queryByText("BP@Home remote blood pressure monitoring"),
    ).not.toBeInTheDocument();
  });
});
